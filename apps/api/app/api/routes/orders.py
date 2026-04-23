from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_session
from app.core.enums import BookDraftStatus
from app.models.book_draft import BookDraft, BookDraftItem
from app.models.dream_entry import DreamEntry
from app.models.order import Order
from app.schemas.order import OrderCreateRequest, OrderListResponse, OrderRead, OrderStatusUpdateRequest
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

    order = Order(book_draft_id=draft.id, quantity=payload.quantity, export_version="1.0")
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


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> OrderRead:
    order = _get_order_or_404(session, order_id)
    order.status = payload.status
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
