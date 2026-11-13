import { TimeSeriesForecaster } from './time-series-forecaster';
import { ForecastMethod } from '../schemas/ia-prediction.entity';

describe('TimeSeriesForecaster', () => {
  it('should select the method from history length', () => {
    expect(TimeSeriesForecaster.selectMethod(1)).toBe(
      ForecastMethod.MOVING_AVERAGE,
    );
    expect(TimeSeriesForecaster.selectMethod(5)).toBe(
      ForecastMethod.LINEAR_TREND,
    );
    expect(TimeSeriesForecaster.selectMethod(14)).toBe(
      ForecastMethod.SEASONAL_TREND,
    );
  });

  it('should compute a moving average on the last window', () => {
    expect(TimeSeriesForecaster.movingAverage([1, 2, 3, 10, 20], 2)).toBe(15);
    expect(TimeSeriesForecaster.movingAverage([])).toBe(0);
  });

  it('should fit an exact linear regression', () => {
    const { slope, intercept } = TimeSeriesForecaster.linearRegression([
      2, 4, 6, 8,
    ]);
    expect(slope).toBeCloseTo(2);
    expect(intercept).toBeCloseTo(2);
  });

  it('should handle a single point regression', () => {
    expect(TimeSeriesForecaster.linearRegression([5])).toEqual({
      slope: 0,
      intercept: 5,
    });
  });

  it('should extrapolate a perfect linear trend with full confidence interval collapse', () => {
    const r = TimeSeriesForecaster.forecast([10, 20, 30, 40], 2);
    expect(r.method).toBe(ForecastMethod.LINEAR_TREND);
    expect(r.points.map((p) => p.value)).toEqual([50, 60]);
    expect(r.points[0].lower).toBe(50);
    expect(r.summary.residual_std).toBe(0);
  });

  it('should capture weekly seasonality', () => {
    // Week-ends (positions 5 et 6) plus chargés, sans tendance.
    const week = [50, 50, 50, 50, 50, 90, 90];
    const history = [...week, ...week, ...week];
    const r = TimeSeriesForecaster.forecast(history, 7);
    expect(r.method).toBe(ForecastMethod.SEASONAL_TREND);
    const values = r.points.map((p) => Math.round(p.value));
    expect(values).toEqual(week);
    expect(r.summary.seasonal_indices).toHaveLength(7);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('should combine trend and seasonality', () => {
    const history = Array.from(
      { length: 28 },
      (_, x) => 100 + 2 * x + (x % 7 >= 5 ? 30 : 0),
    );
    const r = TimeSeriesForecaster.forecast(history, 7);
    expect(r.summary.slope).toBeCloseTo(2, 3);
    const expected = Array.from(
      { length: 7 },
      (_, h) => 100 + 2 * (28 + h) + ((28 + h) % 7 >= 5 ? 30 : 0),
    );
    r.points.forEach((p, i) => expect(p.value).toBeCloseTo(expected[i], 2));
  });

  it('should fall back when history is too short for the requested method', () => {
    const r = TimeSeriesForecaster.forecast([10, 12, 14], 1, {
      method: ForecastMethod.SEASONAL_TREND,
    });
    expect(r.method).toBe(ForecastMethod.LINEAR_TREND);
    const single = TimeSeriesForecaster.forecast([42], 3, {
      method: ForecastMethod.LINEAR_TREND,
    });
    expect(single.method).toBe(ForecastMethod.MOVING_AVERAGE);
    expect(single.points.map((p) => p.value)).toEqual([42, 42, 42]);
  });

  it('should clamp values to the provided bounds', () => {
    const r = TimeSeriesForecaster.forecast([80, 90, 100], 3, { max: 100 });
    expect(r.points.every((p) => p.value <= 100 && p.upper <= 100)).toBe(true);
    const down = TimeSeriesForecaster.forecast([20, 10, 0], 2, { min: 0 });
    expect(down.points.every((p) => p.value >= 0)).toBe(true);
  });

  it('should widen intervals with the horizon', () => {
    const r = TimeSeriesForecaster.forecast([10, 14, 9, 15, 11, 13], 3);
    const widths = r.points.map((p) => p.upper - p.lower);
    expect(widths[2]).toBeGreaterThan(widths[0]);
  });

  it('should throw on empty history, invalid horizon or NaN values', () => {
    expect(() => TimeSeriesForecaster.forecast([], 3)).toThrow(
      'Historique vide',
    );
    expect(() => TimeSeriesForecaster.forecast([1], 0)).toThrow('horizon');
    expect(() => TimeSeriesForecaster.forecast([1, NaN], 1)).toThrow(
      'non numériques',
    );
  });

  it('should bound confidence and handle a zero mean', () => {
    expect(TimeSeriesForecaster.confidence(0, 0, 28)).toBe(0.99);
    expect(TimeSeriesForecaster.confidence(0, 5, 28)).toBe(0.05);
  });

  describe('accuracy', () => {
    it('should compute MAE, MAPE and accuracy', () => {
      expect(
        TimeSeriesForecaster.accuracy([
          { predicted: 110, actual: 100 },
          { predicted: 45, actual: 50 },
        ]),
      ).toEqual({ count: 2, mae: 7.5, mape: 10, accuracy: 90 });
    });

    it('should exclude zero actuals from MAPE', () => {
      const r = TimeSeriesForecaster.accuracy([
        { predicted: 5, actual: 0 },
        { predicted: 90, actual: 100 },
      ]);
      expect(r.mape).toBe(10);
      expect(r.mae).toBe(7.5);
    });

    it('should return null MAPE when all actuals are zero', () => {
      expect(
        TimeSeriesForecaster.accuracy([{ predicted: 1, actual: 0 }]).mape,
      ).toBeNull();
    });

    it('should return nulls for no pairs', () => {
      expect(TimeSeriesForecaster.accuracy([])).toEqual({
        count: 0,
        mae: null,
        mape: null,
        accuracy: null,
      });
    });
  });
});
