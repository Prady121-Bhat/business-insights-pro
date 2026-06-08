import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_absolute_error, mean_squared_error

from ..models.forecast import (
    Algorithm, DataPoint, ForecastPoint, ForecastMetadata,
    ForecastResponse, ForecastRequest,
)


def _add_periods(date: datetime, n: int, granularity: str) -> datetime:
    if granularity == "month":
        return date + relativedelta(months=n)
    if granularity == "week":
        return date + timedelta(weeks=n)
    return date + timedelta(days=n)


def _format_date(dt: datetime, granularity: str) -> str:
    if granularity == "month":
        return dt.strftime("%Y-%m")
    return dt.strftime("%Y-%m-%d")


def _parse_date(s: str) -> datetime:
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {s}")


def _compute_errors(actual: np.ndarray, predicted: np.ndarray) -> tuple[float, float, Optional[float]]:
    mae = float(mean_absolute_error(actual, predicted))
    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
    mask = actual != 0
    mape = float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100) if mask.any() else None
    return mae, rmse, mape


def _detect_trend(values: np.ndarray) -> tuple[str, float]:
    if len(values) < 2:
        return "flat", 0.0
    x = np.arange(len(values)).reshape(-1, 1)
    model = LinearRegression().fit(x, values)
    slope = model.coef_[0]
    mean_val = np.mean(np.abs(values)) or 1
    strength = min(1.0, abs(slope) / mean_val)
    direction = "up" if slope > 0 else ("down" if slope < 0 else "flat")
    return direction, float(strength)


def _detect_seasonality(values: np.ndarray, period: int = 12) -> bool:
    if len(values) < period * 2:
        return False
    try:
        from scipy.signal import periodogram
        freqs, power = periodogram(values)
        dominant_idx = np.argmax(power[1:]) + 1
        dominant_freq = freqs[dominant_idx]
        implied_period = 1 / dominant_freq if dominant_freq > 0 else 0
        return abs(implied_period - period) < 3
    except Exception:
        return False


def _linear_regression_forecast(
    values: np.ndarray,
    dates: list[datetime],
    periods: int,
    granularity: str,
    confidence_level: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    n = len(values)
    x = np.arange(n).reshape(-1, 1)

    # Polynomial degree 2 for slight curve-fitting; guard against overfitting short series
    degree = 2 if n >= 8 else 1
    poly = PolynomialFeatures(degree=degree)
    x_poly = poly.fit_transform(x)

    model = LinearRegression().fit(x_poly, values)
    fitted = model.predict(x_poly)

    # Residual std for confidence interval
    residuals = values - fitted
    se = np.std(residuals, ddof=degree + 1)
    t_val = stats.t.ppf((1 + confidence_level) / 2, df=max(1, n - degree - 1))

    # Future
    x_future = np.arange(n, n + periods).reshape(-1, 1)
    x_future_poly = poly.transform(x_future)
    preds = model.predict(x_future_poly)
    preds = np.maximum(0, preds)  # revenue/sales can't be negative

    # Widening CI for future periods
    margin = t_val * se * (1 + np.arange(1, periods + 1) * 0.05)

    r2 = float(model.score(x_poly, values))
    return preds, preds - margin, preds + margin, {"r_squared": r2}


def _moving_average_forecast(
    values: np.ndarray,
    periods: int,
    window: Optional[int] = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    n = len(values)
    w = window or min(6, n // 2, 3)

    # Weighted moving average — recent data gets more weight
    weights = np.arange(1, w + 1, dtype=float)
    weights /= weights.sum()

    preds = []
    history = list(values)
    for _ in range(periods):
        window_vals = np.array(history[-w:])
        pred = float(np.dot(weights[-len(window_vals):] / weights[-len(window_vals):].sum(), window_vals))
        pred = max(0, pred)
        preds.append(pred)
        history.append(pred)

    preds = np.array(preds)
    std = np.std(values[-w:]) if n >= w else np.std(values)
    margin = std * (1 + np.arange(1, periods + 1) * 0.1)

    return preds, preds - margin, preds + margin, {}


def _exponential_smoothing_forecast(
    values: np.ndarray,
    periods: int,
    alpha: Optional[float] = None,
    beta: Optional[float] = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    n = len(values)

    # Optimise alpha via grid search if not provided
    if alpha is None:
        best_alpha, best_err = 0.3, float("inf")
        for a in np.arange(0.1, 0.95, 0.05):
            s = values[0]
            fitted = [s]
            for v in values[1:]:
                s = a * v + (1 - a) * s
                fitted.append(s)
            err = mean_absolute_error(values, fitted)
            if err < best_err:
                best_err, best_alpha = err, a
        alpha = best_alpha

    # Holt's double exponential smoothing (trend-aware)
    use_trend = n >= 6 and beta is None
    if use_trend:
        beta = 0.1
        level = values[0]
        trend = (values[-1] - values[0]) / max(1, n - 1)
        for v in values[1:]:
            prev_level = level
            level = alpha * v + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend

        preds = np.array([max(0, level + (i + 1) * trend) for i in range(periods)])
    else:
        s = values[0]
        for v in values[1:]:
            s = alpha * v + (1 - alpha) * s
        preds = np.full(periods, max(0, s))

    std = np.std(values) * 0.5
    margin = std * (1 + np.arange(1, periods + 1) * 0.08)

    return preds, preds - margin, preds + margin, {"alpha": alpha, "beta": beta}


def _ensemble_forecast(
    values: np.ndarray,
    dates: list[datetime],
    periods: int,
    granularity: str,
    confidence_level: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    lr_pred, lr_lo, lr_hi, lr_meta = _linear_regression_forecast(values, dates, periods, granularity, confidence_level)
    ma_pred, ma_lo, ma_hi, _ = _moving_average_forecast(values, periods)
    es_pred, es_lo, es_hi, es_meta = _exponential_smoothing_forecast(values, periods)

    # Weighted ensemble — LR gets higher weight if good R²
    r2 = lr_meta.get("r_squared", 0.5)
    w_lr = 0.5 + r2 * 0.2
    w_ma = 0.2
    w_es = 1.0 - w_lr - w_ma

    preds = w_lr * lr_pred + w_ma * ma_pred + w_es * es_pred
    lower = w_lr * lr_lo + w_ma * ma_lo + w_es * es_lo
    upper = w_lr * lr_hi + w_ma * ma_hi + w_es * es_hi

    return preds, lower, upper, {**lr_meta, **es_meta}


def run_forecast(req: ForecastRequest) -> ForecastResponse:
    values = np.array([p.value for p in req.data_points], dtype=float)
    dates = [_parse_date(p.date) for p in req.data_points]
    last_date = dates[-1]

    # Fit and get in-sample predictions for error metrics
    algo = req.algorithm
    n = len(values)

    if algo == Algorithm.LINEAR_REGRESSION or (algo == Algorithm.ENSEMBLE and n < 5):
        preds, lower, upper, meta = _linear_regression_forecast(
            values, dates, req.periods, req.granularity, req.confidence_level
        )
        algo_used = Algorithm.LINEAR_REGRESSION
    elif algo == Algorithm.MOVING_AVERAGE:
        preds, lower, upper, meta = _moving_average_forecast(values, req.periods)
        algo_used = Algorithm.MOVING_AVERAGE
    elif algo == Algorithm.EXPONENTIAL_SMOOTHING:
        preds, lower, upper, meta = _exponential_smoothing_forecast(values, req.periods)
        algo_used = Algorithm.EXPONENTIAL_SMOOTHING
    else:  # ensemble
        preds, lower, upper, meta = _ensemble_forecast(
            values, dates, req.periods, req.granularity, req.confidence_level
        )
        algo_used = Algorithm.ENSEMBLE

    # In-sample fit for error metrics using linear regression baseline
    x_in = np.arange(n).reshape(-1, 1)
    lr_in = LinearRegression().fit(x_in, values)
    fitted_in = lr_in.predict(x_in)
    mae, rmse, mape = _compute_errors(values, fitted_in)

    trend_direction, trend_strength = _detect_trend(values)
    seasonality = _detect_seasonality(values)

    # Build historical output (actual values with fitted bounds)
    std_hist = np.std(values) * 0.1
    historical_points = [
        ForecastPoint(
            date=_format_date(dates[i], req.granularity),
            predicted=float(values[i]),
            lower=float(max(0, values[i] - std_hist)),
            upper=float(values[i] + std_hist),
            is_forecast=False,
        )
        for i in range(n)
    ]

    # Build forecast output
    forecast_points = []
    for i in range(req.periods):
        fdate = _add_periods(last_date, i + 1, req.granularity)
        forecast_points.append(ForecastPoint(
            date=_format_date(fdate, req.granularity),
            predicted=float(max(0, preds[i])),
            lower=float(max(0, lower[i])),
            upper=float(max(0, upper[i])),
            is_forecast=True,
        ))

    # Summary stats
    next_val = float(preds[0])
    last_val = float(values[-1])
    growth_pct = ((next_val - last_val) / last_val * 100) if last_val != 0 else 0
    period_total = float(np.sum(preds))

    summary = {
        "next_period_forecast": round(next_val, 2),
        "period_total_forecast": round(period_total, 2),
        "growth_vs_last": round(growth_pct, 2),
        "avg_forecast": round(float(np.mean(preds)), 2),
        "min_forecast": round(float(np.min(preds)), 2),
        "max_forecast": round(float(np.max(preds)), 2),
    }

    fm = ForecastMetadata(
        algorithm_used=algo_used,
        mae=round(mae, 2),
        rmse=round(rmse, 2),
        mape=round(mape, 2) if mape is not None else None,
        r_squared=round(meta.get("r_squared", 0), 4) if "r_squared" in meta else None,
        data_points_used=n,
        trend_direction=trend_direction,
        trend_strength=round(trend_strength, 4),
        seasonality_detected=seasonality,
    )

    return ForecastResponse(
        company_id=req.company_id,
        metric=req.metric,
        granularity=req.granularity,
        historical=historical_points,
        forecast=forecast_points,
        metadata=fm,
        summary=summary,
    )
