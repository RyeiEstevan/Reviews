from fastapi import APIRouter, status

from app.schemas.user import (
    MessageResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.services.email_verification_service import EmailVerificationService
from app.schemas.user import EmailTokenRequest, ResendVerificationRequest
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def serialize_user(user):
    return UserResponse(
        name=user.name,
        username=user.username,
        email=user.email,
        bio=user.bio,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_private=user.is_private,
        created_at=user.created_at,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse,
)
async def register(data: UserCreate):
    user = await AuthService.register_user(data)
    return serialize_user(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    token = await AuthService.login_user(data)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/register/check", response_model=MessageResponse)
async def register_check():
    return {"message": "Auth router funcionando"}

@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: EmailTokenRequest):
    await EmailVerificationService.verify(data.token)
    return {"message": "E-mail verificado com sucesso"}


@router.post("/resend-verification-email", response_model=MessageResponse)
async def resend_verification_email(data: ResendVerificationRequest):
    await EmailVerificationService.resend(data.email)
    return {"message": "E-mail de verificação reenviado com sucesso"}

@router.get("/verify-email-link", response_class=HTMLResponse)
async def verify_email_link(token: str):
    try:
        await EmailVerificationService.verify(token)
        return """
        <html>
            <head><title>E-mail verificado</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px;">
                <h2>E-mail verificado com sucesso ✅</h2>
                <p>Sua conta foi confirmada e você já pode fazer login.</p>
            </body>
        </html>
        """
    except HTTPException as e:
        return HTMLResponse(
            content=f"""
            <html>
                <head><title>Erro na verificação</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px;">
                    <h2>Não foi possível verificar o e-mail ❌</h2>
                    <p>{e.detail}</p>
                </body>
            </html>
            """,
            status_code=e.status_code,
        )