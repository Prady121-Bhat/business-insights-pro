from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.config import settings
from app.routers.forecast import router as forecast_router

app = FastAPI(
    title="Business Insights Pro — Analytics Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restricted to internal network in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(forecast_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "analytics", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL,
    )
