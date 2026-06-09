import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.db.models import DOCUMENT_MODELS

client = None
database = None

def get_motor_client():
    if settings.mongodb_tls:
        return AsyncIOMotorClient(
            settings.mongodb_url,
            tls=True,
            tlsCAFile=certifi.where(),
        )
    return AsyncIOMotorClient(settings.mongodb_url)

async def init_db(db=None):
    global client, database

    if db is None:
        client = get_motor_client()
        database = client[settings.mongodb_db]
    else:
        database = db

    await init_beanie(
        database=database,
        document_models=DOCUMENT_MODELS,
    )

def get_database():
    """Return the MongoDB database instance for direct collection access."""
    if database is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return database