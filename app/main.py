from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import settings
from app.database import init_db
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.include_router(auth_router)
app.include_router(users_router)


@app.get("/")
async def root():
    return {"message": "Reviews API está rodando"}


@app.get("/health")
async def health():
    return {"status": "ok"}