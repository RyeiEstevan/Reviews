from fastapi import HTTPException, status
from app.services.email_verification_service import EmailVerificationService
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserUpdate


class AuthService:
    @staticmethod
    async def register_user(data: UserCreate) -> User:
        existing_email = await User.find_one(User.email == data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já está em uso",
            )

        existing_username = await User.find_one(User.username == data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username já está em uso",
            )

        user = User(
            name=data.name,
            username=data.username,
            email=data.email,
            hashed_password=hash_password(data.password),
            bio=None,
            avatar_url=None,
            is_active=True,
            is_verified=False,
            is_private=False,
        )

        await user.insert()
        await EmailVerificationService.create_and_send(user)
        return user

    @staticmethod
    async def login_user(data: UserLogin) -> str:
        user = await User.find_one(User.email == data.email)

        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha inválidos",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A conta está inativa",
            )
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="E-mail ainda não verificado",
            )

        return create_access_token(
            {
                "sub": user.email,
                "username": user.username,
            }
        )

    @staticmethod
    async def get_user_by_email(email: str) -> User:
        user = await User.find_one(User.email == email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )

        return user

    @staticmethod
    async def update_user(current_user: User, data: UserUpdate) -> User:
        update_data = data.model_dump(exclude_unset=True)

        new_username = update_data.get("username")
        if new_username and new_username != current_user.username:
            existing_username = await User.find_one(User.username == new_username)
            if existing_username and str(existing_username.id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username já está em uso",
                )

        for field, value in update_data.items():
            setattr(current_user, field, value)

        await current_user.save()
        return current_user

    @staticmethod
    async def deactivate_user(current_user: User) -> User:
        current_user.is_active = False
        await current_user.save()
        return current_user