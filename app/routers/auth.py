"""Authentication router.

Public login endpoint that exchanges credentials for a JWT. It lives in its own
router (no `require_admin` guard) so it stays decoupled from `/admin/*`: removing
it never affects the admin surface. The token it issues carries the `sub` and
`role` claims that `get_current_user`/`require_admin` consume.
"""

from fastapi import APIRouter, HTTPException

from app.core.security import create_access_token, verify_password
from app.db.models import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = "invalid credentials"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest) -> TokenResponse:
    user = await User.find_one(
        {"$or": [{"username": body.username}, {"email": body.username}]}
    )
    # One generic error for every failure mode (unknown user, no password set,
    # wrong password) so the response never reveals whether an account exists (RNF04).
    if user is None or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS)
    token = create_access_token(sub=user.username, role=user.role)
    return TokenResponse(access_token=token, role=user.role, username=user.username)
