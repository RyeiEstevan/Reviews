import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.email_verification_token import EmailVerificationToken

client = AsyncIOMotorClient(
    settings.mongodb_url,
    tls=True,
    tlsCAFile=certifi.where(),
)

database = client[settings.mongodb_db]


async def init_db():
    await init_beanie(
        database=database,
        document_models=[User, EmailVerificationToken],
    )

    indexes = await database["email_verification_tokens"].index_information()

    if "expires_at_1" not in indexes:
        await database["email_verification_tokens"].create_index(
            "expires_at",
            expireAfterSeconds=0,
        )