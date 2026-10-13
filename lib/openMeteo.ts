// lib/openMeteo.ts
const BASE = 'https://api.open-meteo.com/v1/forecast';

export class ForecastFetchError extends Error {
  constructor(public readonly status: number) {
    super(`Forecast request failed with status ${status}`);
    this.name = 'ForecastFetchError';
  }
}

export async function fetchForecast<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new ForecastFetchError(response.status);
  return response.json();
}

export function forecastErrorMessage(error: unknown): string {
  return error instanceof ForecastFetchError && error.status === 429
    ? 'リクエスト制限に達しました。しばらく待ってから再試行してください。'
    : 'エラーが発生しました。ネットワークをご確認の上、再試行してください。';
}

export function buildUrl(lat: number, lon: number, mode: '48h' | '7d') {
  const common = `latitude=${lat}&longitude=${lon}&timezone=auto&wind_speed_unit=ms`;

  if (mode === '48h') {
    // 48時間は時間別
    const hourly =
      'hourly=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&forecast_days=2';
    return `${BASE}?${common}&${hourly}`;
  } else {
    // 7日間は日別
    const daily =
      'daily=' +
      [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'precipitation_sum',
        'wind_speed_10m_max', // ←ここ
      ].join(',') +
      '&forecast_days=7';
    return `${BASE}?${common}&${daily}`;
  }
}
