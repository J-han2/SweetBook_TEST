from __future__ import annotations

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.core.enums import ExportStatus, OrderStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.models.order_history import OrderStatusHistory
from app.models.tag import Tag
from app.schemas.admin import (
    AdminMemoRequest,
    AdminOrderListResponse,
    AdminOrderRead,
    AdminStats,
    BulkExportRequest,
    BulkExportResult,
    BulkStatusChangeRequest,
    BulkStatusChangeResult,
)
from app.services.exporter import build_order_export_archive
from app.services.presenters import serialize_book_draft

router = APIRouter(prefix="/admin", tags=["Admin"])

# Admin-visible status transitions
ALLOWED_TRANSITIONS: dict[OrderStatus, OrderStatus] = {
    OrderStatus.CONFIRMED: OrderStatus.PROCESSING,
    OrderStatus.PROCESSING: OrderStatus.SHIPPED,
    OrderStatus.SHIPPED: OrderStatus.RECEIVED,
}


def _serialize_admin_order(order: Order) -> AdminOrderRead:
    return AdminOrderRead(
        id=order.id,
        status=order.status,
        quantity=order.quantity,
        recipient_name=order.recipient_name,
        recipient_phone=order.recipient_phone,
        shipping_address=order.shipping_address,
        shipping_address_detail=order.shipping_address_detail,
        export_status=order.export_status,
        export_error=order.export_error,
        admin_memo=order.admin_memo,
        export_version=order.export_version,
        created_at=order.created_at,
        updated_at=order.updated_at,
        book_draft=serialize_book_draft(order.book_draft),
        status_history=[
            {"id": h.id, "order_id": h.order_id, "from_status": h.from_status,
             "to_status": h.to_status, "note": h.note, "changed_at": h.changed_at}
            for h in (order.status_history or [])
        ],
    )


def _get_order_with_all(session: Session, order_id: int) -> Order:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.book_draft)
            .selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags),
            selectinload(Order.status_history),
        )
    )
    order = session.scalar(stmt)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")
    return order


@router.get("/orders", response_model=AdminOrderListResponse)
def list_admin_orders(
    session: Annotated[Session, Depends(get_session)],
    status_filter: list[OrderStatus] | None = Query(default=None, alias="status"),
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort: str = "created_at_desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> AdminOrderListResponse:
    stmt = (
        select(Order)
        .options(
            selectinload(Order.book_draft)
            .selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags),
            selectinload(Order.status_history),
        )
    )

    if status_filter:
        stmt = stmt.where(Order.status.in_(status_filter))

    if q:
        stmt = stmt.where(
            or_(
                Order.id == (int(q) if q.isdigit() else -1),
                Order.recipient_name.ilike(f"%{q}%"),
                Order.recipient_phone.ilike(f"%{q}%"),
            )
        )

    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Order.created_at <= f"{date_to} 23:59:59")

    if sort == "created_at_asc":
        stmt = stmt.order_by(Order.created_at.asc())
    else:
        stmt = stmt.order_by(Order.created_at.desc())

    total = session.scalar(select(func.count()).select_from(stmt.subquery()))
    total = total or 0
    total_pages = max(1, (total + page_size - 1) // page_size)

    orders = session.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return AdminOrderListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
        items=[_serialize_admin_order(o) for o in orders],
    )


@router.get("/orders/export/csv")
def export_csv(
    session: Annotated[Session, Depends(get_session)],
    status_filter: list[OrderStatus] | None = Query(default=None, alias="status"),
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> StreamingResponse:
    stmt = select(Order).options(selectinload(Order.book_draft))

    if status_filter:
        stmt = stmt.where(Order.status.in_(status_filter))
    if q:
        stmt = stmt.where(
            or_(
                Order.id == (int(q) if q.isdigit() else -1),
                Order.recipient_name.ilike(f"%{q}%"),
                Order.recipient_phone.ilike(f"%{q}%"),
            )
        )
    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Order.created_at <= f"{date_to} 23:59:59")

    stmt = stmt.order_by(Order.created_at.desc())
    orders = session.scalars(stmt).all()

    STATUS_LABELS = {
        "pending": "주문 전", "confirmed": "주문 확인 중", "processing": "제작 중",
        "shipped": "제작 완료", "received": "수령 확인", "cancelled": "주문 취소",
    }
    EXPORT_LABELS = {
        "pending": "미추출", "processing": "추출 중", "completed": "추출 완료", "failed": "추출 실패",
    }

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["주문번호", "주문일", "책제목", "수량", "주문상태", "메타데이터추출상태", "수령인", "전화번호", "배송지", "배송지상세"])

    for o in orders:
        writer.writerow([
            o.id,
            o.created_at.strftime("%Y-%m-%d %H:%M"),
            o.book_draft.title if o.book_draft else "",
            o.quantity,
            STATUS_LABELS.get(o.status.value, o.status.value),
            EXPORT_LABELS.get(o.export_status.value, o.export_status.value),
            o.recipient_name or "",
            o.recipient_phone or "",
            o.shipping_address or "",
            o.shipping_address_detail or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.get("/orders/{order_id}", response_model=AdminOrderRead)
def get_admin_order(
    order_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> AdminOrderRead:
    return _serialize_admin_order(_get_order_with_all(session, order_id))


@router.post("/orders/bulk-status", response_model=BulkStatusChangeResult)
def bulk_change_status(
    payload: BulkStatusChangeRequest,
    session: Annotated[Session, Depends(get_session)],
) -> BulkStatusChangeResult:
    successes = 0
    failures = []

    for order_id in payload.order_ids:
        try:
            order = _get_order_with_all(session, order_id)
            if payload.to_status not in ALLOWED_TRANSITIONS.values():
                raise ValueError(f"허용되지 않는 상태값입니다: {payload.to_status}")
            expected_from = {v: k for k, v in ALLOWED_TRANSITIONS.items()}.get(payload.to_status)
            if expected_from and order.status != expected_from:
                raise ValueError(f"현재 상태({order.status})에서 {payload.to_status}으로 변경할 수 없습니다.")

            history = OrderStatusHistory(
                order_id=order.id,
                from_status=order.status.value,
                to_status=payload.to_status.value,
                note=payload.note,
            )
            session.add(history)
            order.status = payload.to_status
            session.add(order)
            successes += 1
        except Exception as exc:
            failures.append({"order_id": order_id, "reason": str(exc)})

    session.commit()
    return BulkStatusChangeResult(
        success_count=successes,
        failure_count=len(failures),
        failures=failures,
    )


@router.post("/orders/bulk-export", response_model=BulkExportResult)
def bulk_export(
    payload: BulkExportRequest,
    session: Annotated[Session, Depends(get_session)],
) -> BulkExportResult:
    successes = 0
    failures = []
    download_urls = []

    for order_id in payload.order_ids:
        try:
            order = _get_order_with_all(session, order_id)
            order.export_status = ExportStatus.PROCESSING
            session.add(order)
            session.flush()

            build_order_export_archive(order)  # validate exportable archive

            order.export_status = ExportStatus.COMPLETED
            order.export_error = None
            session.add(order)
            download_urls.append({
                "order_id": order_id,
                "url": f"/api/orders/{order_id}/export",
                "filename": f"dreamarchive-order-{order_id}.zip",
            })
            successes += 1
        except Exception as exc:
            try:
                order.export_status = ExportStatus.FAILED
                order.export_error = str(exc)
                session.add(order)
            except Exception:
                pass
            failures.append({"order_id": order_id, "reason": str(exc)})

    session.commit()
    return BulkExportResult(
        success_count=successes,
        failure_count=len(failures),
        failures=failures,
        download_urls=download_urls,
    )


@router.post("/orders/{order_id}/retry-export", response_model=AdminOrderRead)
def retry_export(
    order_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> AdminOrderRead:
    order = _get_order_with_all(session, order_id)
    if order.export_status != ExportStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="추출 실패 상태인 주문만 재시도할 수 있습니다.")

    try:
        order.export_status = ExportStatus.PROCESSING
        session.add(order)
        session.flush()

        build_order_export_archive(order)

        order.export_status = ExportStatus.COMPLETED
        order.export_error = None
    except Exception as exc:
        order.export_status = ExportStatus.FAILED
        order.export_error = str(exc)

    session.add(order)
    session.commit()
    return _serialize_admin_order(_get_order_with_all(session, order_id))


@router.patch("/orders/{order_id}/memo", response_model=AdminOrderRead)
def update_admin_memo(
    order_id: int,
    payload: AdminMemoRequest,
    session: Annotated[Session, Depends(get_session)],
) -> AdminOrderRead:
    order = _get_order_with_all(session, order_id)
    order.admin_memo = payload.memo.strip() if payload.memo else None
    session.add(order)
    session.commit()
    return _serialize_admin_order(_get_order_with_all(session, order_id))


@router.get("/stats", response_model=AdminStats)
def get_stats(session: Annotated[Session, Depends(get_session)]) -> AdminStats:
    def count_status(s: OrderStatus) -> int:
        return session.scalar(select(func.count(Order.id)).where(Order.status == s)) or 0

    def count_export(s: ExportStatus) -> int:
        return session.scalar(select(func.count(Order.id)).where(Order.export_status == s)) or 0

    total_orders = session.scalar(select(func.count(Order.id))) or 0
    total_dreams = session.scalar(select(func.count(DreamEntry.id))) or 0

    # Popular tags
    popular_raw = session.execute(
        select(Tag.name, Tag.category, func.count().label("usage_count"))
        .join(DreamEntry.tags)
        .group_by(Tag.id)
        .order_by(func.count().desc())
        .limit(10)
    ).all()
    popular_tags = [{"name": r.name, "category": r.category, "usage_count": r.usage_count} for r in popular_raw]

    return AdminStats(
        total_orders=total_orders,
        pending_orders=count_status(OrderStatus.PENDING),
        confirmed_orders=count_status(OrderStatus.CONFIRMED),
        processing_orders=count_status(OrderStatus.PROCESSING),
        shipped_orders=count_status(OrderStatus.SHIPPED),
        received_orders=count_status(OrderStatus.RECEIVED),
        cancelled_orders=count_status(OrderStatus.CANCELLED),
        export_pending=count_export(ExportStatus.PENDING),
        export_processing=count_export(ExportStatus.PROCESSING),
        export_completed=count_export(ExportStatus.COMPLETED),
        export_failed=count_export(ExportStatus.FAILED),
        popular_tags=popular_tags,
        total_dreams=total_dreams,
    )

