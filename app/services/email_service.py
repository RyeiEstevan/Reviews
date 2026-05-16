from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings


class EmailService:
    @staticmethod
    async def send_email(to_email: str, subject: str, html_body: str):
        message = MIMEMultipart("alternative")
        message["From"] = settings.smtp_from
        message["To"] = to_email
        message["Subject"] = subject

        message.attach(MIMEText(html_body, "html", "utf-8"))

        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )