"""Real-MongoDB integration tier (PLAN T1).

mongomock is not a faithful MongoDB replica — it diverges on `$regex`, indexes and
aggregation — so the correctness-sensitive checks (case-insensitive substring
search, indexes, cascade) need a real server. This conftest overrides the parent's
autouse mongomock `db` fixture for everything under `tests/real_mongo/`, pointing
Beanie at the `mongo-test` service instead.

Enable it by starting the server and exporting its URL:

    docker compose --profile test up -d mongo-test
    docker compose run --rm -e MONGO_TEST_URL=mongodb://mongo-test:27017 api pytest -q tests/real_mongo

When `MONGO_TEST_URL` is unset (the default `pytest -q` run) every test here skips,
so the mongomock suite stays green and self-contained.
"""

import os

import pytest
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.db.models import DOCUMENT_MODELS

DB_NAME = "reviews_real_test"


async def _connect(url: str):
    client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=3000)
    await client.admin.command("ping")          # fail fast if the server is down
    await client.drop_database(DB_NAME)          # isolation: start from a clean DB
    database = client[DB_NAME]
    await init_beanie(database=database, document_models=DOCUMENT_MODELS)
    return client, database


@pytest.fixture(autouse=True)
def db(loop):
    """Override the mongomock `db` with a real MongoDB bound to the shared loop."""
    url = os.getenv("MONGO_TEST_URL")
    if not url:
        pytest.skip("MONGO_TEST_URL not set — real-Mongo tier disabled")
    try:
        client, database = loop.run_until_complete(_connect(url))
    except Exception as exc:  # ServerSelectionTimeoutError and friends
        pytest.skip(f"real MongoDB unavailable at {url}: {exc}")
    yield database
    loop.run_until_complete(client.drop_database(DB_NAME))
    client.close()
