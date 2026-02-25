from typing import Optional
import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKeyConstraint, Index, Integer, String, Table, text
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass


class Group(Base):
    __tablename__ = 'group'
    __table_args__ = (
        Index('name', 'name', unique=True),
        {'comment': '组'}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='组ID')
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment='组名称')
    yn: Mapped[int] = mapped_column(TINYINT, nullable=False, server_default=text("'1'"), comment='是否启用')
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'), comment='创建时间')

    scope: Mapped[list['Scope']] = relationship('Scope', secondary='group_scope_rel', back_populates='group')
    user: Mapped[list['User']] = relationship('User', secondary='group_user_rel', back_populates='group')


class Scope(Base):
    __tablename__ = 'scope'
    __table_args__ = (
        Index('name', 'name', unique=True),
        {'comment': '权限范围'}
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, comment='权限范围ID')
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment='权限范围名称')
    yn: Mapped[int] = mapped_column(TINYINT, nullable=False, server_default=text("'1'"), comment='是否启用')
    description: Mapped[Optional[str]] = mapped_column(String(100), comment='权限范围描述')
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'), comment='创建时间')

    group: Mapped[list['Group']] = relationship('Group', secondary='group_scope_rel', back_populates='scope')


class User(Base):
    __tablename__ = 'user'
    __table_args__ = (
        Index('email', 'email', unique=True),
        {'comment': '用户'}
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, comment='用户ID')
    email: Mapped[str] = mapped_column(String(100), nullable=False, comment='邮箱')
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment='用户名')
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False, comment='密码哈希')
    yn: Mapped[int] = mapped_column(TINYINT, nullable=False, server_default=text("'1'"), comment='是否启用')
    create_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP'), comment='创建时间')
    update_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), comment='更新时间')

    group: Mapped[list['Group']] = relationship('Group', secondary='group_user_rel', back_populates='user')


t_group_scope_rel = Table(
    'group_scope_rel', Base.metadata,
    Column('group_id', Integer, primary_key=True, comment='组ID'),
    Column('scope_id', Integer, primary_key=True, comment='权限范围ID'),
    ForeignKeyConstraint(['group_id'], ['group.id'], ondelete='CASCADE', name='group_scope_rel_ibfk_1'),
    ForeignKeyConstraint(['scope_id'], ['scope.id'], ondelete='CASCADE', name='group_scope_rel_ibfk_2'),
    Index('scope_id', 'scope_id'),
    comment='组-权限关系'
)


t_group_user_rel = Table(
    'group_user_rel', Base.metadata,
    Column('group_id', Integer, primary_key=True, comment='组ID'),
    Column('user_id', BigInteger, primary_key=True, comment='用户ID'),
    ForeignKeyConstraint(['group_id'], ['group.id'], ondelete='CASCADE', name='group_user_rel_ibfk_1'),
    ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE', name='group_user_rel_ibfk_2'),
    Index('user_id', 'user_id'),
    comment='组-用户关系'
)
