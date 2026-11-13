import { ForecastMethod } from '../schemas/ia-prediction.entity';

/**
 * Moteur de prévision de séries temporelles, déterministe et explicable.
 *
 * Méthodes disponibles :
 *  - moyenne mobile (historique court) ;
 *  - tendance linéaire par moindres carrés ;
 *  - tendance linéaire + saisonnalité hebdomadaire additive (≥ 2 semaines).
 *
 * L'intervalle de confiance est ±1,96 σ des résidus de l'ajustement, élargi
 * avec l'horizon (√h). Remplaçable par un modèle ML (ARIMA, Prophet…) tant
 * que `forecast()` conserve sa signature.
 */

export const FORECASTER_VERSION = 'heuristic-v1';

/** Période de saisonnalité (jours de la semaine). */
export const SEASON_LENGTH = 7;

export const DEFAULT_MOVING_AVERAGE_WINDOW = 7;

export interface ForecastOptions {
  method?: ForecastMethod;
  /** Fenêtre de la moyenne mobile. */
  window?: number;
  /** Bornes de plausibilité (ex. 0 et 100 pour un taux d'occupation). */
  min?: number;
  max?: number;
}

export interface ForecastPoint {
  /** Pas de temps (1 = la période suivant le dernier point d'historique). */
  step: number;
  value: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  method: ForecastMethod;
  confidence: number;
  points: ForecastPoint[];
  summary: {
    history_length: number;
    mean: number;
    slope: number | null;
    residual_std: number;
    seasonal_indices: number[] | null;
  };
}

export interface AccuracyMetrics {
  count: number;
  /** Erreur absolue moyenne. */
  mae: number | null;
  /** Erreur absolue moyenne en pourcentage (paires à valeur réelle nulle exclues). */
  mape: number | null;
  /** Précision = 100 - MAPE (bornée à 0). */
  accuracy: number | null;
}

const round = (v: number, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

const mean = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;

export class TimeSeriesForecaster {
  /** Choisit la méthode selon la longueur de l'historique. */
  static selectMethod(length: number): ForecastMethod {
    if (length >= SEASON_LENGTH * 2) return ForecastMethod.SEASONAL_TREND;
    if (length >= 3) return ForecastMethod.LINEAR_TREND;
    return ForecastMethod.MOVING_AVERAGE;
  }

  /** Moyenne des `window` dernières valeurs. */
  static movingAverage(
    history: number[],
    window = DEFAULT_MOVING_AVERAGE_WINDOW,
  ): number {
    if (history.length === 0) return 0;
    return mean(history.slice(-Math.max(1, window)));
  }

  /** Régression linéaire par moindres carrés sur x = 0..n-1. */
  static linearRegression(history: number[]): {
    slope: number;
    intercept: number;
  } {
    const n = history.length;
    if (n === 0) return { slope: 0, intercept: 0 };
    if (n === 1) return { slope: 0, intercept: history[0] };
    const xMean = (n - 1) / 2;
    const yMean = mean(history);
    let num = 0;
    let den = 0;
    history.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    const slope = den === 0 ? 0 : num / den;
    return { slope, intercept: yMean - slope * xMean };
  }

  /**
   * Indices saisonniers additifs : moyenne des écarts à la tendance pour
   * chaque position dans la saison, recentrés pour sommer à 0.
   */
  static seasonalIndices(
    history: number[],
    trend: { slope: number; intercept: number },
    period = SEASON_LENGTH,
  ): number[] {
    const sums = new Array<number>(period).fill(0);
    const counts = new Array<number>(period).fill(0);
    history.forEach((y, x) => {
      const k = x % period;
      sums[k] += y - (trend.intercept + trend.slope * x);
      counts[k] += 1;
    });
    const raw = sums.map((s, k) => (counts[k] === 0 ? 0 : s / counts[k]));
    const offset = mean(raw);
    return raw.map((v) => v - offset);
  }

  /**
   * Ajuste conjointement tendance linéaire et saisonnalité additive par
   * « backfitting » : on alterne régression sur la série désaisonnalisée et
   * recalcul des indices jusqu'à convergence. Évite que la saisonnalité ne
   * biaise la pente (ex. historique se terminant par un week-end chargé).
   */
  static fitSeasonalTrend(
    history: number[],
    period = SEASON_LENGTH,
    maxIterations = 200,
  ): { trend: { slope: number; intercept: number }; seasonal: number[] } {
    let trend = this.linearRegression(history);
    let seasonal = this.seasonalIndices(history, trend, period);
    for (let i = 0; i < maxIterations; i++) {
      const next = this.linearRegression(
        history.map((y, x) => y - seasonal[x % period]),
      );
      const converged =
        Math.abs(next.slope - trend.slope) < 1e-10 &&
        Math.abs(next.intercept - trend.intercept) < 1e-10;
      trend = next;
      seasonal = this.seasonalIndices(history, trend, period);
      if (converged) break;
    }
    return { trend, seasonal };
  }

  /** Calcule une prévision sur `horizon` pas. */
  static forecast(
    history: number[],
    horizon: number,
    options: ForecastOptions = {},
  ): ForecastResult {
    if (history.length === 0) {
      throw new Error('Historique vide : impossible de prévoir');
    }
    if (!Number.isInteger(horizon) || horizon < 1) {
      throw new Error('L’horizon doit être un entier ≥ 1');
    }
    if (history.some((v) => !Number.isFinite(v))) {
      throw new Error('L’historique contient des valeurs non numériques');
    }

    const n = history.length;
    let method = options.method ?? this.selectMethod(n);
    // Repli si l'historique est insuffisant pour la méthode demandée.
    if (method === ForecastMethod.SEASONAL_TREND && n < SEASON_LENGTH * 2) {
      method =
        n >= 3 ? ForecastMethod.LINEAR_TREND : ForecastMethod.MOVING_AVERAGE;
    }
    if (method === ForecastMethod.LINEAR_TREND && n < 2) {
      method = ForecastMethod.MOVING_AVERAGE;
    }
    if (method === ForecastMethod.MANUAL) {
      method = ForecastMethod.MOVING_AVERAGE;
    }

    const window = options.window ?? DEFAULT_MOVING_AVERAGE_WINDOW;
    let trend = this.linearRegression(history);
    let seasonal: number[] | null = null;
    if (method === ForecastMethod.SEASONAL_TREND) {
      ({ trend, seasonal } = this.fitSeasonalTrend(history));
    }

    const fitted = (x: number): number => {
      switch (method) {
        case ForecastMethod.MOVING_AVERAGE:
          return this.movingAverage(history.slice(0, Math.max(1, x)), window);
        case ForecastMethod.LINEAR_TREND:
          return trend.intercept + trend.slope * x;
        default:
          return (
            trend.intercept + trend.slope * x + seasonal![x % SEASON_LENGTH]
          );
      }
    };

    const residuals = history.map((y, x) => y - fitted(x));
    const residualStd = Math.sqrt(mean(residuals.map((r) => r * r)));
    const histMean = mean(history);

    const clamp = (v: number) => {
      let out = v;
      if (options.min !== undefined) out = Math.max(options.min, out);
      if (options.max !== undefined) out = Math.min(options.max, out);
      return out;
    };

    const points: ForecastPoint[] = [];
    for (let h = 1; h <= horizon; h++) {
      const x = n - 1 + h;
      const value =
        method === ForecastMethod.MOVING_AVERAGE
          ? this.movingAverage(history, window)
          : fitted(x);
      const margin = 1.96 * residualStd * Math.sqrt(h);
      points.push({
        step: h,
        value: round(clamp(value)),
        lower: round(clamp(value - margin)),
        upper: round(clamp(value + margin)),
      });
    }

    return {
      method,
      confidence: this.confidence(histMean, residualStd, n),
      points,
      summary: {
        history_length: n,
        mean: round(histMean),
        slope:
          method === ForecastMethod.MOVING_AVERAGE ? null : round(trend.slope),
        residual_std: round(residualStd),
        seasonal_indices: seasonal ? seasonal.map((v) => round(v)) : null,
      },
    };
  }

  /**
   * Confiance heuristique (0,05 à 0,99) : 1 - coefficient de variation des
   * résidus, pondérée par la quantité d'historique (pleine à 28 points).
   */
  static confidence(histMean: number, residualStd: number, n: number): number {
    const cv =
      histMean === 0
        ? residualStd === 0
          ? 0
          : 1
        : Math.min(1, residualStd / Math.abs(histMean));
    const dataFactor = Math.min(1, n / (SEASON_LENGTH * 4));
    const raw = (1 - cv) * (0.5 + 0.5 * dataFactor);
    return round(Math.min(0.99, Math.max(0.05, raw)), 2);
  }

  /** Calcule MAE, MAPE et précision sur des paires (prévu, réel). */
  static accuracy(
    pairs: { predicted: number; actual: number }[],
  ): AccuracyMetrics {
    if (pairs.length === 0) {
      return { count: 0, mae: null, mape: null, accuracy: null };
    }
    const mae = mean(pairs.map((p) => Math.abs(p.predicted - p.actual)));
    const relative = pairs
      .filter((p) => p.actual !== 0)
      .map((p) => Math.abs((p.predicted - p.actual) / p.actual) * 100);
    const mape = relative.length === 0 ? null : round(mean(relative), 2);
    return {
      count: pairs.length,
      mae: round(mae, 2),
      mape,
      accuracy: mape === null ? null : round(Math.max(0, 100 - mape), 2),
    };
  }
}
