import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.email_verification_token import EmailVerificationToken
from app.models.password_reset_token import PasswordResetToken
from app.models.block import Block
from app.models.friend_request import FriendRequest
from app.models.friendship import Friendship


client = None
database = None


def get_motor_client():
    return AsyncIOMotorClient(
        settings.mongodb_url,
        tls=True,
        tlsCAFile=certifi.where(),
    )


async def init_db(db=None):
    global client, database

    if db is None:
        client = get_motor_client()
        database = client[settings.mongodb_db]
    else:
        database = db

    await init_beanie(
        database=database,
        document_models=[
            User,
            EmailVerificationToken,
            PasswordResetToken,
            FriendRequest,
            Friendship,
            Block,
        ],
    )

    await database["email_verification_tokens"].create_index(
        "expires_at",
        expireAfterSeconds=0,
    )

    await database["password_reset_tokens"].create_index(
        "expires_at",
        expireAfterSeconds=0,
    )