from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.core.enums import OrderStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.models.order_history import OrderStatusHistory
from app.schemas.admin import (
    AdminMemoRequest,
    AdminOrderListResponse,
    AdminOrderRead,
    AdminStats,
    BulkExportRequest,
    BulkStatusChangeRequest,
    BulkStatusChangeResult,
)
from app.services.exporter import build_multi_order_export_archive
from app.services.presenters import serialize_book_draft

router = APIRouter(prefix="/admin", tags=["Admin"])

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
        admin_memo=order.admin_memo,
        export_version=order.export_version,
        created_at=order.created_at,
        updated_at=order.updated_at,
        book_draft=serialize_book_draft(order.book_draft),
        status_history=[
            {
                "id": history.id,
                "order_id": history.order_id,
                "from_status": history.from_status,
                "to_status": history.to_status,
                "note": history.note,
                "changed_at": history.changed_at,
            }
            for history in (order.status_history or [])
        ],
    )


def _order_with_all_options():
    return (
        selectinload(Order.book_draft)
        .selectinload(BookDraft.items)
        .selectinload(BookDraftItem.dream_entry)
        .selectinload(DreamEntry.tags),
        selectinload(Order.status_history),
    )


def _get_order_with_all(session: Session, order_id: int) -> Order:
    stmt = select(Order).where(Order.id == order_id).options(*_order_with_all_options())
    order = session.scalar(stmt)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없어요.")
    return order


def _apply_order_filters(
    stmt,
    *,
    status_filter: list[OrderStatus] | None,
    q: str | None,
    date_from: str | None,
    date_to: str | None,
):
    if status_filter:
        stmt = stmt.where(Order.status.in_(status_filter))

    if q:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Order.id == (int(q) if q.isdigit() else -1),
                Order.recipient_name.ilike(term),
                Order.recipient_phone.ilike(term),
                BookDraft.title.ilike(term),
            )
        )

    if date_from:
        stmt = stmt.where(Order.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Order.created_at <= f"{date_to} 23:59:59")

    return stmt


def _append_status_history(session: Session, order: Order, to_status: OrderStatus, note: str | None = None) -> None:
    session.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=order.status.value if order.status else None,
            to_status=to_status.value,
            note=note,
        )
    )


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
    stmt = select(Order).join(Order.book_draft).options(*_order_with_all_options())
    stmt = _apply_order_filters(
        stmt,
        status_filter=status_filter,
        q=q,
        date_from=date_from,
        date_to=date_to,
    )

    if sort == "created_at_asc":
        stmt = stmt.order_by(Order.created_at.asc())
    else:
        stmt = stmt.order_by(Order.created_at.desc())

    total = session.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    total_pages = max(1, (total + page_size - 1) // page_size)
    orders = session.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return AdminOrderListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
        items=[_serialize_admin_order(order) for order in orders],
    )


@router.get("/orders/export/csv")
def export_csv(
    session: Annotated[Session, Depends(get_session)],
    status_filter: list[OrderStatus] | None = Query(default=None, alias="status"),
    q: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> Response:
    stmt = select(Order).join(Order.book_draft).options(selectinload(Order.book_draft))
    stmt = _apply_order_filters(
        stmt,
        status_filter=status_filter,
        q=q,
        date_from=date_from,
        date_to=date_to,
    ).order_by(Order.created_at.desc())

    orders = session.scalars(stmt).all()
    status_labels = {
        "pending": "주문 전",
        "confirmed": "주문 확인 중",
        "processing": "제작 중",
        "shipped": "제작 완료",
        "received": "수령 확인",
        "cancelled": "주문 취소",
    }

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["주문 번호", "주문일", "책 제목", "수량", "주문 상태", "수령인", "전화번호", "배송지", "상세 주소"])

    for order in orders:
        writer.writerow(
            [
                order.id,
                order.created_at.strftime("%Y-%m-%d %H:%M"),
                order.book_draft.title if order.book_draft else "",
                order.quantity,
                status_labels.get(order.status.value, order.status.value),
                order.recipient_name or "",
                order.recipient_phone or "",
                order.shipping_address or "",
                order.shipping_address_detail or "",
            ]
        )

    return Response(
        content=output.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": 'attachment; filename="orders.csv"'},
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
    failures: list[dict] = []
    reverse_map = {to_status: from_status for from_status, to_status in ALLOWED_TRANSITIONS.items()}

    for order_id in payload.order_ids:
        try:
            order = _get_order_with_all(session, order_id)
            expected_from = reverse_map.get(payload.to_status)
            if expected_from is None:
                raise ValueError("허용되지 않는 상태 변경입니다.")
            if order.status != expected_from:
                raise ValueError(f"현재 상태가 {expected_from.value}일 때만 변경할 수 있어요.")

            _append_status_history(session, order, payload.to_status, payload.note)
            order.status = payload.to_status
            session.add(order)
            successes += 1
        except Exception as exc:  # noqa: BLE001
            failures.append({"order_id": order_id, "reason": str(exc)})

    session.commit()
    return BulkStatusChangeResult(
        success_count=successes,
        failure_count=len(failures),
        failures=failures,
    )


@router.post("/orders/export-archive")
def export_archive(
    payload: BulkExportRequest,
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    if not payload.order_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="추출할 주문을 하나 이상 선택해주세요.")

    orders: list[Order] = []
    for order_id in payload.order_ids:
        orders.append(_get_order_with_all(session, order_id))

    archive = build_multi_order_export_archive(orders)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return Response(
        content=archive,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="dreamarchive-orders-{timestamp}.zip"'},
    )


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
def get_stats(
    session: Annotated[Session, Depends(get_session)],
    date_from: str | None = None,
    date_to: str | None = None,
) -> AdminStats:
    base_stmt = select(Order)
    base_stmt = _apply_order_filters(
        base_stmt,
        status_filter=None,
        q=None,
        date_from=date_from,
        date_to=date_to,
    )

    filtered_subquery = base_stmt.subquery()

    def count_status(target_status: OrderStatus) -> int:
        return (
            session.scalar(
                select(func.count())
                .select_from(filtered_subquery)
                .where(filtered_subquery.c.status == target_status.value)
            )
            or 0
        )

    total_orders = session.scalar(select(func.count()).select_from(filtered_subquery)) or 0
    total_dreams = session.scalar(select(func.count(DreamEntry.id))) or 0

    daily_rows = session.execute(
        select(
            func.date(filtered_subquery.c.created_at).label("label"),
            func.count().label("value"),
        )
        .group_by(func.date(filtered_subquery.c.created_at))
        .order_by(func.date(filtered_subquery.c.created_at))
    ).all()

    monthly_rows = session.execute(
        select(
            func.strftime("%Y-%m", filtered_subquery.c.created_at).label("label"),
            func.count().label("value"),
        )
        .group_by(func.strftime("%Y-%m", filtered_subquery.c.created_at))
        .order_by(func.strftime("%Y-%m", filtered_subquery.c.created_at))
    ).all()

    status_order = [
        ("pending", "주문 전"),
        ("confirmed", "주문 확인 중"),
        ("processing", "제작 중"),
        ("shipped", "제작 완료"),
        ("received", "수령 확인"),
        ("cancelled", "주문 취소"),
    ]
    status_breakdown = [
        {
            "status": status_value,
            "label": label,
            "value": session.scalar(
                select(func.count())
                .select_from(filtered_subquery)
                .where(filtered_subquery.c.status == status_value)
            )
            or 0,
        }
        for status_value, label in status_order
    ]

    return AdminStats(
        total_orders=total_orders,
        pending_orders=count_status(OrderStatus.PENDING),
        confirmed_orders=count_status(OrderStatus.CONFIRMED),
        processing_orders=count_status(OrderStatus.PROCESSING),
        shipped_orders=count_status(OrderStatus.SHIPPED),
        received_orders=count_status(OrderStatus.RECEIVED),
        cancelled_orders=count_status(OrderStatus.CANCELLED),
        total_dreams=total_dreams,
        daily_orders=[{"label": row.label, "value": row.value} for row in daily_rows if row.label],
        monthly_orders=[{"label": row.label, "value": row.value} for row in monthly_rows if row.label],
        status_breakdown=status_breakdown,
    )
