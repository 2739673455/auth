from typing import Optional
import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Table, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class EmailCode(Base):
    __tablename__ = 'email_code'
    __table_args__ = (
        Index('idx_email_code_email', 'email'),
        Index('idx_email_code_expire_at', 'expire_at')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    expire_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('0'))
    create_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP'))


class Group(Base):
    __tablename__ = 'group'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    yn: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    scope: Mapped[list['Scope']] = relationship('Scope', secondary='group_scope_rel', back_populates='group')
    user: Mapped[list['User']] = relationship('User', secondary='group_user_rel', back_populates='group')


class Scope(Base):
    __tablename__ = 'scope'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    yn: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    description: Mapped[Optional[str]] = mapped_column(String(100), server_default=text('NULL'))
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    group: Mapped[list['Group']] = relationship('Group', secondary='group_scope_rel', back_populates='scope')


class User(Base):
    __tablename__ = 'user'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False)
    yn: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    update_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    group: Mapped[list['Group']] = relationship('Group', secondary='group_user_rel', back_populates='user')
    refresh_token: Mapped[list['RefreshToken']] = relationship('RefreshToken', back_populates='user')


t_group_scope_rel = Table(
    'group_scope_rel', Base.metadata,
    Column('group_id', ForeignKey('group.id'), primary_key=True),
    Column('scope_id', ForeignKey('scope.id'), primary_key=True)
)


t_group_user_rel = Table(
    'group_user_rel', Base.metadata,
    Column('group_id', ForeignKey('group.id'), primary_key=True),
    Column('user_id', ForeignKey('user.id'), primary_key=True)
)


class RefreshToken(Base):
    __tablename__ = 'refresh_token'
    __table_args__ = (
        Index('idx_refresh_token_user_id', 'user_id'),
    )

    jti: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    yn: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text('1'))
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    user: Mapped['User'] = relationship('User', back_populates='refresh_token')
