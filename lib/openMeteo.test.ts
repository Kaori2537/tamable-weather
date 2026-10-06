import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchForecast, ForecastFetchError, forecastErrorMessage } from './openMeteo';

const url = 'https://api.open-meteo.com/v1/forecast?latitude=35&longitude=139';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchForecast', () => {
  it('returns the successful JSON unchanged and fetches the supplied URL', async () => {
    const body = { hourly: { time: ['2025-01-01T00:00:00'], temperature_2m: [10] } };
    const json = vi.fn().mockResolvedValue(body);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json });
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchForecast<typeof body>(url)).toBe(body);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url);
    expect(json).toHaveBeenCalledOnce();
  });

  it('propagates the original successful-response JSON rejection', async () => {
    const failure = new SyntaxError('Invalid JSON');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: vi.fn().mockRejectedValue(failure),
    }));

    await expect(fetchForecast(url)).rejects.toBe(failure);
  });

  it.each([400, 429, 500])('rejects HTTP %s with ForecastFetchError and its status', async (status) => {
    const response = new Response(status === 500 ? 'Internal Server Error' : '{"error":true}', {
      status,
      headers: { 'Content-Type': status === 500 ? 'text/plain' : 'application/json' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const request = fetchForecast(url);
    await expect(request).rejects.toBeInstanceOf(ForecastFetchError);
    await expect(request).rejects.toMatchObject({ status });
  });

  it('propagates the original network rejection', async () => {
    const failure = new TypeError('Failed to fetch');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure));

    await expect(fetchForecast(url)).rejects.toBe(failure);
  });
});

describe('forecastErrorMessage', () => {
  it('uses the rate-limit message for ForecastFetchError with status 429', () => {
    expect(forecastErrorMessage(new ForecastFetchError(429)))
      .toBe('リクエスト制限に達しました。しばらく待ってから再試行してください。');
  });

  it.each([
    new ForecastFetchError(400),
    new ForecastFetchError(500),
    new TypeError('Failed to fetch'),
    new Error('429 rate limit'),
    { status: 429 },
    null,
    undefined,
    '429',
  ])('uses the general message for %j', (error) => {
    expect(forecastErrorMessage(error))
      .toBe('エラーが発生しました。ネットワークをご確認の上、再試行してください。');
  });
});
