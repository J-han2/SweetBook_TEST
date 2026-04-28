from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.core.enums import BookDraftStatus, OrderStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.schemas.order import OrderConfirmRequest, OrderCreateRequest, OrderListResponse, OrderRead, OrderUpdateRequest
from app.services.exporter import build_order_export
from app.services.presenters import serialize_order

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> OrderRead:
    draft = _get_draft_with_items(session, payload.book_draft_id)
    if draft.status != BookDraftStatus.FINALIZED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Finalized 상태의 책 초안만 주문할 수 있습니다.")

    order = Order(book_draft_id=draft.id, quantity=1, export_version="1.0")
    session.add(order)
    session.commit()
    return serialize_order(_get_order_or_404(session, order.id))


@router.get("", response_model=OrderListResponse)
def list_orders(session: Annotated[Session, Depends(get_session)]) -> OrderListResponse:
    orders = session.scalars(
        select(Order)
        .options(
            selectinload(Order.book_draft)
            .selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags)
        )
        .order_by(Order.created_at.desc())
    ).all()
    return OrderListResponse(total=len(orders), items=[serialize_order(order) for order in orders])


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, session: Annotated[Session, Depends(get_session)]) -> OrderRead:
    return serialize_order(_get_order_or_404(session, order_id))


@router.patch("/{order_id}", response_model=OrderRead)
def update_order(
    order_id: int,
    payload: OrderUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> OrderRead:
    order = _get_order_or_404(session, order_id)
    if order.status not in {OrderStatus.PENDING, OrderStatus.CONFIRMED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="주문 전 또는 주문 확인 중 상태에서만 주문 내용을 수정할 수 있습니다.")

    if payload.quantity is not None:
        order.quantity = payload.quantity
    if payload.recipient_name is not None:
        order.recipient_name = _clean_required_text(payload.recipient_name, "수령인 이름")
    if payload.recipient_phone is not None:
        order.recipient_phone = _clean_required_text(payload.recipient_phone, "전화번호")
    if payload.shipping_address is not None:
        order.shipping_address = _clean_required_text(payload.shipping_address, "배송지")
    if payload.shipping_address_detail is not None:
        order.shipping_address_detail = _clean_optional_text(payload.shipping_address_detail)

    session.add(order)
    session.commit()
    return serialize_order(_get_order_or_404(session, order.id))


@router.post("/{order_id}/confirm", response_model=OrderRead)
def confirm_order(
    order_id: int,
    payload: OrderConfirmRequest,
    session: Annotated[Session, Depends(get_session)],
) -> OrderRead:
    order = _get_order_or_404(session, order_id)
    if order.status != OrderStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="주문 전 상태에서만 주문을 진행할 수 있습니다.")

    order.quantity = payload.quantity
    order.recipient_name = _clean_required_text(payload.recipient_name, "수령인 이름")
    order.recipient_phone = _clean_required_text(payload.recipient_phone, "전화번호")
    order.shipping_address = _clean_required_text(payload.shipping_address, "배송지")
    order.shipping_address_detail = _clean_optional_text(payload.shipping_address_detail)
    order.status = OrderStatus.CONFIRMED
    session.add(order)
    session.commit()
    return serialize_order(_get_order_or_404(session, order.id))


@router.post("/{order_id}/receive", response_model=OrderRead)
def receive_order(order_id: int, session: Annotated[Session, Depends(get_session)]) -> OrderRead:
    order = _get_order_or_404(session, order_id)
    if order.status != OrderStatus.SHIPPED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="발송 완료 상태에서만 수령 확인을 할 수 있습니다.")

    order.status = OrderStatus.RECEIVED
    session.add(order)
    session.commit()
    return serialize_order(_get_order_or_404(session, order.id))


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(order_id: int, session: Annotated[Session, Depends(get_session)]) -> OrderRead:
    order = _get_order_or_404(session, order_id)
    if order.status not in {OrderStatus.PENDING, OrderStatus.CONFIRMED}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="주문 전 또는 주문 확인 중 상태에서만 주문을 취소할 수 있습니다.",
        )

    order.status = OrderStatus.CANCELLED
    session.add(order)
    session.commit()
    return serialize_order(_get_order_or_404(session, order.id))


@router.get("/{order_id}/export")
def export_order(order_id: int, session: Annotated[Session, Depends(get_session)]) -> JSONResponse:
    order = _get_order_or_404(session, order_id)
    payload = build_order_export(order)
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="dreamarchive-order-{order_id}.json"'},
    )


def _get_order_or_404(session: Session, order_id: int) -> Order:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.book_draft)
            .selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags)
        )
    )
    order = session.scalar(stmt)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")
    return order


def _get_draft_with_items(session: Session, book_draft_id: int) -> BookDraft:
    stmt = (
        select(BookDraft)
        .where(BookDraft.id == book_draft_id)
        .options(
            selectinload(BookDraft.items)
            .selectinload(BookDraftItem.dream_entry)
            .selectinload(DreamEntry.tags)
        )
    )
    draft = session.scalar(stmt)
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="책 초안을 찾을 수 없습니다.")
    return draft


def _clean_required_text(value: str, label: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"{label}을 입력해 주세요.")
    return cleaned


def _clean_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None
