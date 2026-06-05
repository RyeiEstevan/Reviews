from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Reviews API"
    mongodb_url: str
    mongodb_db: str = "reviews_db"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://127.0.0.1:8000"


    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    smtp_from: str

    email_verification_expire_hours: int = 24
    password_reset_expire_hours: int = 2

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()