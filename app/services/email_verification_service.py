import secrets
from datetime import datetime, UTC, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.models.email_verification_token import EmailVerificationToken
from app.models.user import User
from app.services.email_service import EmailService


class EmailVerificationService:
    @staticmethod
    async def create_and_send(user: User) -> None:
        await EmailVerificationToken.find(
            EmailVerificationToken.user_id == str(user.id),
            EmailVerificationToken.used == False,
        ).delete()

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(
            hours=settings.email_verification_expire_hours
        )

        record = EmailVerificationToken(
            user_id=str(user.id),
            email=user.email,
            token=token,
            expires_at=expires_at,
            used=False,
        )
        await record.insert()

        verify_link = f"{settings.backend_url}/auth/verify-email-link?token={token}"

        html = f"""
        <h2>Confirme seu e-mail</h2>
        <p>Olá, {user.name}.</p>
        <p>Clique no link abaixo para confirmar sua conta:</p>
        <p><a href="{verify_link}">{verify_link}</a></p>
        <p>Esse link expira em {settings.email_verification_expire_hours} horas.</p>
        """

        await EmailService.send_email(
            to_email=user.email,
            subject="Confirme seu e-mail",
            html_body=html,
        )

    @staticmethod
    async def verify(token: str) -> None:
        token_data = await EmailVerificationToken.find_one(
            EmailVerificationToken.token == token
        )

        if (
            not token_data
            or token_data.used
            or datetime.now(UTC) > token_data.expires_at
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de verificação inválido ou expirado",
            )

        user = await User.get(token_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        user.is_verified = True
        await user.save()

        token_data.used = True
        await token_data.save()

    @staticmethod
    async def resend(email: str) -> None:
        user = await User.find_one(User.email == email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-mail já verificado",
            )

        await EmailVerificationService.create_and_send(user)