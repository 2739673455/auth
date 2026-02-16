"""邮件发送服务"""

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Literal

import aiosmtplib

from app.config import CFG


async def send_email(
    to_email: str,
    subject: str,
    content: str,
    content_type: Literal["plain", "html"] = "plain",
) -> None:
    """发送邮件

    Args:
        to_email: 收件人邮箱
        subject: 邮件主题
        content: 邮件内容
        content_type: 内容类型，plain 或 html

    Returns:
        发送成功返回 True，失败返回 False
    """
    msg = MIMEMultipart()
    msg["From"] = (
        f"{CFG.email.from_name} <{CFG.email.from_email}>"
        if CFG.email.from_name
        else CFG.email.from_email
    )
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(content, content_type, "utf-8"))

    await aiosmtplib.send(
        msg,
        hostname=CFG.email.smtp_host,
        port=CFG.email.smtp_port,
        username=CFG.email.smtp_user,
        password=CFG.email.smtp_password,
        use_tls=True,
    )


async def send_verification_code(to_email: str, code: str, code_type: str) -> None:
    """发送验证码邮件

    Args:
        to_email: 收件人邮箱
        code: 验证码
        code_type: 验证码类型

    Returns:
        发送成功返回 True，失败返回 False
    """

    type_text = {
        "register": "注册",
        "reset_email": "重置邮箱",
        "reset_password": "重置密码",
    }[code_type]
    subject = f"您的{type_text}验证码"

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #333;">{type_text}验证码</h2>
        <p>您的{type_text}验证码是：</p>
        <p style="font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 4px;">
            {code}
        </p>
        <p style="color: #666; font-size: 14px;">
            验证码有效期为 10 分钟，请尽快使用。
        </p>
        <p style="color: #999; font-size: 12px;">
            如果您没有进行此操作，请忽略此邮件。
        </p>
    </body>
    </html>
    """

    return await send_email(to_email, subject, html_content, "html")
