from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import init_db
from app.routers import admin_audit, admin_catalog, admin_news, admin_users, auth, public, home
from app.routers.content import router as content_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(admin_catalog.router)
app.include_router(admin_news.router)
app.include_router(admin_audit.router)
app.include_router(public.router)
app.include_router(home.router)
app.include_router(content_router)

@app.get("/")
async def root():
    return {"message": f"{settings.app_name} is Running!"}

@app.get("/health")
async def health():
    return {"status": "ok"}
