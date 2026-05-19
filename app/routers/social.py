from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.schemas.social import (
    FriendRequestResponse,
    FriendResponse,
    PrivacyUpdateRequest,
    SocialActionResponse,
)
from app.services.social_service import SocialService


router = APIRouter(tags=["social"])


@router.patch("/users/me/privacy", response_model=SocialActionResponse)
async def update_privacy(data: PrivacyUpdateRequest, current_user=Depends(get_current_user)):
    return await SocialService.update_privacy(current_user, data.is_private)


@router.post("/users/{username}/friend-request", response_model=SocialActionResponse)
async def send_friend_request(username: str, current_user=Depends(get_current_user)):
    return await SocialService.send_friend_request(current_user, username)


@router.post("/friend-requests/{request_id}/accept", response_model=SocialActionResponse)
async def accept_friend_request(request_id: str, current_user=Depends(get_current_user)):
    return await SocialService.accept_friend_request(current_user, request_id)


@router.delete("/friend-requests/{request_id}/reject", response_model=SocialActionResponse)
async def reject_friend_request(request_id: str, current_user=Depends(get_current_user)):
    return await SocialService.reject_friend_request(current_user, request_id)


@router.delete("/users/{username}/friendship", response_model=SocialActionResponse)
async def remove_friendship(username: str, current_user=Depends(get_current_user)):
    return await SocialService.remove_friendship(current_user, username)


@router.get("/users/me/friends", response_model=list[FriendResponse])
async def list_my_friends(current_user=Depends(get_current_user)):
    return await SocialService.list_friends(current_user)


@router.get("/users/me/friend-requests", response_model=list[FriendRequestResponse])
async def list_my_friend_requests(current_user=Depends(get_current_user)):
    return await SocialService.list_pending_requests(current_user)


@router.post("/users/{username}/block", response_model=SocialActionResponse)
async def block_user(username: str, current_user=Depends(get_current_user)):
    return await SocialService.block_user(current_user, username)


@router.delete("/users/{username}/block", response_model=SocialActionResponse)
async def unblock_user(username: str, current_user=Depends(get_current_user)):
    return await SocialService.unblock_user(current_user, username)