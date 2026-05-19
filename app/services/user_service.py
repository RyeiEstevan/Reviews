from fastapi import HTTPException, status

from app.models.user import ListStatus, User, UserListItem
from app.schemas.user import UserListItemCreate, UserListItemMove


class UserService:
    @staticmethod
    async def add_list_item(current_user: User, data: UserListItemCreate) -> User:
        existing_item = next(
            (item for item in current_user.list_items if item.item_id == data.item_id),
            None,
        )

        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esse item já está em uma das suas listas",
            )

        current_user.list_items.append(
            UserListItem(
                item_id=data.item_id,
                title=data.title,
                media_type=data.media_type,
                status=data.status,
            )
        )

        await current_user.save()
        return current_user

    @staticmethod
    async def move_list_item(
        current_user: User,
        item_id: str,
        data: UserListItemMove,
    ) -> User:
        item = next(
            (item for item in current_user.list_items if item.item_id == item_id),
            None,
        )

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item não encontrado nas suas listas",
            )

        item.status = data.status
        await current_user.save()
        return current_user

    @staticmethod
    async def remove_list_item(current_user: User, item_id: str) -> User:
        item = next(
            (item for item in current_user.list_items if item.item_id == item_id),
            None,
        )

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item não encontrado nas suas listas",
            )

        current_user.list_items = [
            list_item
            for list_item in current_user.list_items
            if list_item.item_id != item_id
        ]

        await current_user.save()
        return current_user

    @staticmethod
    async def get_grouped_lists(current_user: User) -> dict:
        return {
            "read": [
                item for item in current_user.list_items
                if item.status == ListStatus.read
            ],
            "watched": [
                item for item in current_user.list_items
                if item.status == ListStatus.watched
            ],
            "dropped": [
                item for item in current_user.list_items
                if item.status == ListStatus.dropped
            ],
        }