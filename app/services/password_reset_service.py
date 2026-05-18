import secrets
from datetime import datetime, UTC, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import hash_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.email_service import EmailService


class PasswordResetService:
    @staticmethod
    async def request_reset(email: str) -> None:
        user = await User.find_one(User.email == email)

        if not user or not user.is_active:
            return

        await PasswordResetToken.find(
            PasswordResetToken.user_id == str(user.id),
            PasswordResetToken.used == False,
        ).delete()

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + timedelta(
            hours=settings.password_reset_expire_hours
        )

        record = PasswordResetToken(
            user_id=str(user.id),
            email=user.email,
            token=token,
            expires_at=expires_at,
            used=False,
        )
        await record.insert()

        reset_link = f"{settings.backend_url}/auth/reset-password-link?token={token}"

        html = f"""
        <h2>Recuperação de senha</h2>
        <p>Olá, {user.name}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no link abaixo para continuar:</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>Esse link expira em {settings.password_reset_expire_hours} horas.</p>
        <p>Se você não fez essa solicitação, ignore este e-mail.</p>
        """

        await EmailService.send_email(
            to_email=user.email,
            subject="Redefinição de senha",
            html_body=html,
        )

    @staticmethod
    async def reset_password(token: str, new_password: str) -> None:
        token_data = await PasswordResetToken.find_one(
            PasswordResetToken.token == token
        )

        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O link de recuperação expirou ou já foi utilizado.",
            )

        expires_at = token_data.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        if token_data.used or datetime.now(UTC) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O link de recuperação expirou ou já foi utilizado.",
            )

        user = await User.get(token_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A conta está inativa",
            )

        user.hashed_password = hash_password(new_password)
        await user.save()

        token_data.used = True
        await token_data.save()

    @staticmethod
    async def validate_reset_token(token: str) -> None:
        token_data = await PasswordResetToken.find_one(
            PasswordResetToken.token == token
        )

        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O link de recuperação expirou ou já foi utilizado.",
            )

        expires_at = token_data.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        if token_data.used or datetime.now(UTC) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O link de recuperação expirou ou já foi utilizado.",
            )