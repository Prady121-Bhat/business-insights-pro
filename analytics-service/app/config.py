from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    INTERNAL_API_KEY: str = "changeme-internal-key"
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"

settings = Settings()
