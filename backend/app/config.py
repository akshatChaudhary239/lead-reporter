from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@neon.host/dbname"

    # Auth
    JWT_SECRET: str = "your-256-bit-secret-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # AI
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"


    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str | List[str] = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, str):
            return [s.strip() for s in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    FRONTEND_URL: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
