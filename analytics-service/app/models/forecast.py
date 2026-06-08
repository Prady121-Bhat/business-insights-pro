from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class Algorithm(str, Enum):
    LINEAR_REGRESSION = "linear_regression"
    MOVING_AVERAGE = "moving_average"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"
    ENSEMBLE = "ensemble"


class DataPoint(BaseModel):
    date: str
    value: float


class ForecastRequest(BaseModel):
    company_id: str
    metric: Literal["revenue", "sales_volume", "demand", "customer_growth", "expenses"]
    data_points: list[DataPoint] = Field(..., min_length=3)
    periods: int = Field(default=6, ge=1, le=24)
    algorithm: Algorithm = Algorithm.ENSEMBLE
    granularity: Literal["day", "week", "month"] = "month"
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99)


class ForecastPoint(BaseModel):
    date: str
    predicted: float
    lower: float
    upper: float
    is_forecast: bool = True


class ForecastMetadata(BaseModel):
    algorithm_used: Algorithm
    mae: float
    rmse: float
    mape: Optional[float]
    r_squared: Optional[float]
    data_points_used: int
    trend_direction: Literal["up", "down", "flat"]
    trend_strength: float  # 0-1
    seasonality_detected: bool


class ForecastResponse(BaseModel):
    company_id: str
    metric: str
    granularity: str
    historical: list[ForecastPoint]
    forecast: list[ForecastPoint]
    metadata: ForecastMetadata
    summary: dict
