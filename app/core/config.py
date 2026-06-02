from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Reviews API"
    mongodb_url: str
    mongodb_db: str = "reviews_db"
    
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://127.0.0.1:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()