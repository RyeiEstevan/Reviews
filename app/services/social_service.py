from fastapi import HTTPException, status
from beanie import PydanticObjectId

from app.models.block import Block
from app.models.friend_request import FriendRequest
from app.models.friendship import Friendship
from app.models.user import User


class SocialService:
    @staticmethod
    def _normalize_pair(user_id_1: str, user_id_2: str) -> tuple[str, str]:
        return tuple(sorted([user_id_1, user_id_2]))

    @staticmethod
    async def _get_target_user(username: str) -> User:
        user = await User.find_one(User.username == username)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado",
            )
        return user

    @staticmethod
    async def _ensure_not_self(current_user: User, target_user: User) -> None:
        if str(current_user.id) == str(target_user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você não pode executar essa ação em si mesmo",
            )

    @staticmethod
    async def _ensure_not_blocked(current_user: User, target_user: User) -> None:
        block_1 = await Block.find_one(
            Block.blocker_id == str(current_user.id),
            Block.blocked_id == str(target_user.id),
        )
        block_2 = await Block.find_one(
            Block.blocker_id == str(target_user.id),
            Block.blocked_id == str(current_user.id),
        )

        if block_1 or block_2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Não é possível interagir com esse usuário",
            )

    @staticmethod
    async def update_privacy(current_user: User, is_private: bool):
        current_user.is_private = is_private
        await current_user.save()

        return {
            "message": "Privacidade atualizada com sucesso",
            "status": "updated",
        }

    @staticmethod
    async def send_friend_request(current_user: User, username: str):
        target_user = await SocialService._get_target_user(username)
        await SocialService._ensure_not_self(current_user, target_user)
        await SocialService._ensure_not_blocked(current_user, target_user)

        low_id, high_id = SocialService._normalize_pair(
            str(current_user.id), str(target_user.id)
        )

        existing_friendship = await Friendship.find_one(
            Friendship.user_low_id == low_id,
            Friendship.user_high_id == high_id,
        )
        if existing_friendship:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vocês já são amigos",
            )

        existing_request = await FriendRequest.find_one(
            FriendRequest.sender_id == str(current_user.id),
            FriendRequest.receiver_id == str(target_user.id),
        )
        if existing_request:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solicitação de amizade já enviada",
            )

        inverse_request = await FriendRequest.find_one(
            FriendRequest.sender_id == str(target_user.id),
            FriendRequest.receiver_id == str(current_user.id),
        )
        if inverse_request:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esse usuário já enviou uma solicitação para você",
            )

        if not target_user.is_private:
            friendship = Friendship(
                user_low_id=low_id,
                user_high_id=high_id,
            )
            await friendship.insert()

            return {
                "message": "Amizade criada com sucesso",
                "status": "friends",
            }

        request = FriendRequest(
            sender_id=str(current_user.id),
            receiver_id=str(target_user.id),
        )
        await request.insert()

        return {
            "message": "Solicitação de amizade enviada com sucesso",
            "status": "pending",
        }

    @staticmethod
    async def accept_friend_request(current_user: User, request_id: str):
        request = await FriendRequest.get(PydanticObjectId(request_id))
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitação não encontrada",
            )

        if request.receiver_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode aceitar essa solicitação",
            )

        sender = await User.get(request.sender_id)
        if not sender or not sender.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário remetente não encontrado",
            )

        await SocialService._ensure_not_blocked(current_user, sender)

        low_id, high_id = SocialService._normalize_pair(
            str(current_user.id), str(sender.id)
        )

        existing_friendship = await Friendship.find_one(
            Friendship.user_low_id == low_id,
            Friendship.user_high_id == high_id,
        )
        if not existing_friendship:
            friendship = Friendship(
                user_low_id=low_id,
                user_high_id=high_id,
            )
            await friendship.insert()

        await request.delete()

        reverse_request = await FriendRequest.find_one(
            FriendRequest.sender_id == str(current_user.id),
            FriendRequest.receiver_id == str(sender.id),
        )
        if reverse_request:
            await reverse_request.delete()

        return {
            "message": "Solicitação aceita com sucesso",
            "status": "friends",
        }

    @staticmethod
    async def reject_friend_request(current_user: User, request_id: str):
        request = await FriendRequest.get(PydanticObjectId(request_id))
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Solicitação não encontrada",
            )

        if request.receiver_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode rejeitar essa solicitação",
            )

        await request.delete()

        return {
            "message": "Solicitação rejeitada com sucesso",
            "status": "rejected",
        }

    @staticmethod
    async def remove_friendship(current_user: User, username: str):
        target_user = await SocialService._get_target_user(username)
        await SocialService._ensure_not_self(current_user, target_user)

        low_id, high_id = SocialService._normalize_pair(
            str(current_user.id), str(target_user.id)
        )

        friendship = await Friendship.find_one(
            Friendship.user_low_id == low_id,
            Friendship.user_high_id == high_id,
        )
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Amizade não encontrada",
            )

        await friendship.delete()

        return {
            "message": "Amizade removida com sucesso",
            "status": "removed",
        }

    @staticmethod
    async def list_friends(current_user: User):
        relations_low = await Friendship.find(
            Friendship.user_low_id == str(current_user.id)
        ).to_list()

        relations_high = await Friendship.find(
            Friendship.user_high_id == str(current_user.id)
        ).to_list()

        friend_ids = [
            relation.user_high_id for relation in relations_low
        ] + [
            relation.user_low_id for relation in relations_high
        ]

        if not friend_ids:
            return []

        friends = await User.find({"_id": {"$in": [PydanticObjectId(fid) for fid in friend_ids]}}).to_list()

        active_friends = [user for user in friends if user.is_active]

        return [
            {
                "id": str(user.id),
                "username": user.username,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
            }
            for user in active_friends
        ]

    @staticmethod
    async def list_pending_requests(current_user: User):
        requests = await FriendRequest.find(
            FriendRequest.receiver_id == str(current_user.id)
        ).to_list()

        if not requests:
            return []

        sender_ids = [PydanticObjectId(request.sender_id) for request in requests]
        senders = await User.find({"_id": {"$in": sender_ids}}).to_list()
        sender_map = {str(user.id): user for user in senders}

        response = []
        for request in requests:
            sender = sender_map.get(request.sender_id)
            if not sender or not sender.is_active:
                continue

            response.append(
                {
                    "id": str(request.id),
                    "sender_username": sender.username,
                    "sender_name": sender.name,
                    "sender_avatar_url": sender.avatar_url,
                    "created_at": request.created_at,
                }
            )

        return response

    @staticmethod
    async def block_user(current_user: User, username: str):
        target_user = await SocialService._get_target_user(username)
        await SocialService._ensure_not_self(current_user, target_user)

        existing_block = await Block.find_one(
            Block.blocker_id == str(current_user.id),
            Block.blocked_id == str(target_user.id),
        )
        if existing_block:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Usuário já bloqueado",
            )

        block = Block(
            blocker_id=str(current_user.id),
            blocked_id=str(target_user.id),
        )
        await block.insert()

        low_id, high_id = SocialService._normalize_pair(
            str(current_user.id), str(target_user.id)
        )

        friendship = await Friendship.find_one(
            Friendship.user_low_id == low_id,
            Friendship.user_high_id == high_id,
        )
        if friendship:
            await friendship.delete()

        request_1 = await FriendRequest.find_one(
            FriendRequest.sender_id == str(current_user.id),
            FriendRequest.receiver_id == str(target_user.id),
        )
        if request_1:
            await request_1.delete()

        request_2 = await FriendRequest.find_one(
            FriendRequest.sender_id == str(target_user.id),
            FriendRequest.receiver_id == str(current_user.id),
        )
        if request_2:
            await request_2.delete()

        return {
            "message": "Usuário bloqueado com sucesso",
            "status": "blocked",
        }

    @staticmethod
    async def unblock_user(current_user: User, username: str):
        target_user = await SocialService._get_target_user(username)
        await SocialService._ensure_not_self(current_user, target_user)

        block = await Block.find_one(
            Block.blocker_id == str(current_user.id),
            Block.blocked_id == str(target_user.id),
        )
        if not block:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bloqueio não encontrado",
            )

        await block.delete()

        return {
            "message": "Usuário desbloqueado com sucesso",
            "status": "unblocked",
        }