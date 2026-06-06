"""Test harness for the Reviews backend.

pytest-bdd 7.x does NOT await async step functions (the coroutine is created and
silently dropped), so async steps yield false greens. We therefore run every step
synchronously and drive the async FastAPI app over a single shared event loop:

  * `loop`    - one fresh asyncio loop per test (isolation);
  * `db`      - autouse: a fresh in-memory mongomock-motor database with Beanie
                initialised on that loop (no MongoDB Atlas, no live server);
  * `client`  - a sync facade over httpx.AsyncClient + ASGITransport;
  * `run`     - executes a coroutine on the loop (used to seed the DB directly);
  * `context` - dict to carry state between Given/When/Then steps.
"""

import asyncio

import pytest
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.core.security import create_access_token
from app.db.models import DOCUMENT_MODELS
from app.main import app


class SyncClient:
    """Synchronous facade that drives the ASGI app on the shared event loop."""

    def __init__(self, loop, ac):
        self._loop = loop
        self._ac = ac

    def _run(self, coro):
        return self._loop.run_until_complete(coro)

    def get(self, url, **kw):
        return self._run(self._ac.get(url, **kw))

    def post(self, url, **kw):
        return self._run(self._ac.post(url, **kw))

    def put(self, url, **kw):
        return self._run(self._ac.put(url, **kw))

    def delete(self, url, **kw):
        return self._run(self._ac.delete(url, **kw))


@pytest.fixture
def loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def db(loop):
    database = AsyncMongoMockClient()["reviews_test"]
    loop.run_until_complete(init_beanie(database=database, document_models=DOCUMENT_MODELS))
    return database


@pytest.fixture
def client(loop, db):
    ac = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    yield SyncClient(loop, ac)
    loop.run_until_complete(ac.aclose())


@pytest.fixture
def run(loop, db):
    """Run a coroutine on the shared loop (direct DB seeding from steps)."""
    return lambda coro: loop.run_until_complete(coro)


@pytest.fixture
def context():
    return {}


@pytest.fixture
def auth():
    """Return Authorization headers for a forged JWT (username + role)."""
    def _auth(username, role):
        token = create_access_token(sub=username, role=role)
        return {"Authorization": f"Bearer {token}"}

    return _auth
