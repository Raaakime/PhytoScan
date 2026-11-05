"""Messages échangés avec l'assistant vocal."""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import utcnow


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Regroupe les messages d'une même discussion (généré par le front ou par l'API)
    session_id: Mapped[str] = mapped_column(String(60), index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None)
    role: Mapped[str] = mapped_column(String(10))   # "user" ou "bot" (mêmes valeurs que "sender" dans le front)
    text: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(5), default="fr")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
