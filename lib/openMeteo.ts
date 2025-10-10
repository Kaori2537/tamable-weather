// lib/openMeteo.ts
const BASE = 'https://api.open-meteo.com/v1/forecast';

export function buildUrl(lat: number, lon: number, mode: '48h' | '7d') {
  const common = `latitude=${lat}&longitude=${lon}&timezone=auto`;

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
        'apparent_temperature_max',
        'apparent_temperature_min',
        'precipitation_sum',
        'wind_speed_10m_max', // ←ここ
      ].join(',') +
      '&forecast_days=7';
    return `${BASE}?${common}&${daily}`;
  }
}
