import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers import auth, dashboard, debug, inventory, organizations, partners, purchases, sales

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "StokSaku ERP")
APP_ENV = os.getenv("APP_ENV", "development")
API_VERSION = os.getenv("API_VERSION", "0.1.0")

_allowed_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if APP_ENV == "production" and settings.jwt_secret_key == "stocksaku-secret-key-change-in-production":
    raise RuntimeError("JWT_SECRET_KEY wajib diisi pada environment production")

app = FastAPI(
    title=APP_NAME,
    version=API_VERSION,
    description="Backend API untuk aplikasi StokSaku ERP.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(inventory.router)
app.include_router(partners.router)
app.include_router(purchases.router)
app.include_router(sales.router)
app.include_router(dashboard.router)
app.include_router(debug.router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "app": APP_NAME,
        "message": "StokSaku ERP API is running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "app": APP_NAME,
        "environment": APP_ENV,
    }

@app.get("/health/db")
def check_database(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": "connected",
    }
