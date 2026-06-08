from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional

from ..models.forecast import ForecastRequest, ForecastResponse
from ..services.forecasting import run_forecast
from ..config import settings

router = APIRouter(prefix="/forecast", tags=["forecast"])


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@router.post("", response_model=ForecastResponse)
async def create_forecast(
    req: ForecastRequest,
    _: str = Depends(verify_api_key),
):
    try:
        return run_forecast(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast computation failed: {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "analytics"}
