from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.schemas.user import MessageResponse, UserResponse, UserUpdate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])

security = HTTPBearer()


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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    payload = decode_access_token(token)

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = await AuthService.get_user_by_email(email)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A conta está inativa",
        )

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return serialize_user(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user=Depends(get_current_user)):
    updated_user = await AuthService.update_user(current_user, data)
    return serialize_user(updated_user)


@router.delete("/me", response_model=MessageResponse)
async def delete_me(current_user=Depends(get_current_user)):
    await AuthService.deactivate_user(current_user)
    return {"message": "Conta desativada com sucesso"}