import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings

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
        ],
    )