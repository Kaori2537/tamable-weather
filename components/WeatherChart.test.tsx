import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildUrl } from '../lib/openMeteo';
import { Line, LineChart } from 'recharts';
import { describe, expect, it } from 'vitest';

import WeatherChart from './WeatherChart';

type ElementWithChildren = ReactElement<{ children?: ReactNode }>;

const data = {
  hourly: {
    time: ['2025-01-01T00:00:00'],
    temperature_2m: [10],
    apparent_temperature: [8],
    precipitation: [1],
    windspeed_10m: [2],
  },
  daily: {
    time: ['2025-01-01'],
    temperature_2m_max: [12],
    temperature_2m_min: [4],
    apparent_temperature_max: [10],
    apparent_temperature_min: [2],
    precipitation_sum: [3],
    windspeed_10m_max: [5],
  },
};

function findLineChart(node: ReactNode): ElementWithChildren | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === LineChart) return node;

  let result: ElementWithChildren | undefined;
  Children.forEach(node.props.children, (child) => {
    result ??= findLineChart(child);
  });
  return result;
}

const cases = [
  ['48h', 'temperature', ['temperature']],
  ['48h', 'apparent', ['apparent']],
  ['48h', 'precip', ['precip']],
  ['48h', 'wind', ['wind']],
  ['7d', 'temperature', ['max', 'min']],
  ['7d', 'apparent', ['appMax', 'appMin']],
  ['7d', 'precip', ['precip']],
  ['7d', 'wind', ['wind']],
] as const;

describe('WeatherChart series structure', () => {
  it.each(cases)(
    'passes %s %s series directly to LineChart',
    (period, metric, expectedDataKeys) => {
      const chart = WeatherChart({ period, metric, tempUnit: 'C', data });
      const lineChart = findLineChart(chart);

      expect(lineChart).toBeDefined();
      const directChildren = Children.toArray(lineChart?.props.children);
      expect(directChildren.some(
        (child) => isValidElement(child) && child.type === Fragment,
      )).toBe(false);

      const dataKeys = directChildren
        .filter((child) => isValidElement(child) && child.type === Line)
        .map((child) => String((child as ReactElement<{ dataKey: string }>).props.dataKey));
      expect(dataKeys).toEqual(expectedDataKeys);
    },
  );
});


type ChartProps = Parameters<typeof WeatherChart>[0];
const week = {
  time: ['2025-01-01', '2025-01-02', '2025-01-03'],
  temperature_2m_max: [10, 23, 18],
  temperature_2m_min: [4, -2, 7],
  temperature_2m_mean: [6, 12, 15],
};

function markup(overrides: Partial<ChartProps> = {}) {
  return renderToStaticMarkup(<WeatherChart
    period="7d" metric="temperature" tempUnit="C" data={{ daily: week }} {...overrides}
  />);
}

function expectStats(html: string, values: string[]) {
  expect(html).toContain('data-testid="weekly-temp-stats"');
  ['max', 'min', 'avg'].forEach((key, i) => {
    expect(html).toContain(`data-testid="stat-${key}">${values[i]}</span>`);
  });
}

// Deliberately simulate untrusted API data outside the declared number[] contract.
function apiData(daily: unknown): ChartProps['data'] {
  return { daily } as ChartProps['data'];
}

describe('weekly temperature statistics', () => {
  it.each(['temperature', 'apparent', 'precip', 'wind'] as const)(
    'shows Celsius temperature statistics for %s', (metric) => {
      const html = markup({ metric });
      expectStats(html, ['23.0', '-2.0', '11.0']);
      for (const label of ['最高気温', '最低気温', '平均気温']) {
        expect(html).toContain(`${label}（°C）`);
      }
    },
  );

  it('shows Fahrenheit statistics and units', () => {
    const html = markup({ tempUnit: 'F' });
    expectStats(html, ['73.4', '28.4', '51.8']);
    for (const label of ['最高気温', '最低気温', '平均気温']) {
      expect(html).toContain(`${label}（°F）`);
    }
  });

  it('averages Celsius values before conversion and rounding', () => {
    expectStats(markup({ tempUnit: 'F', data: { daily: {
      ...week, temperature_2m_mean: [0.02, 0.02, 0.08],
    } } }), ['73.4', '28.4', '32.1']);
  });

  it.each(['temperature', 'apparent', 'precip', 'wind'] as const)(
    'omits all statistics in 48h mode for %s', (metric) => {
      const html = markup({ period: '48h', metric, data });
      expect(html).not.toContain('weekly-temp-stats');
      expect(html).not.toContain('data-testid="stat-');
    },
  );

  it.each([
    undefined, {}, { daily: {} }, { daily: { time: [] } },
    { hourly: data.hourly }, { hourly: data.hourly, daily: { time: [] } },
  ])('omits statistics without daily dates: %j', (missing) => {
    const html = markup({ data: missing as ChartProps['data'] });
    expect(html).not.toContain('weekly-temp-stats');
    expect(html).not.toContain('data-testid="stat-');
  });

  it('skips null, undefined, non-numbers and non-finite values independently', () => {
    const time = Array.from({ length: 8 }, (_, i) => `2025-01-0${i + 1}`);
    expectStats(markup({ data: apiData({
      time,
      temperature_2m_max: [null, 8, undefined, NaN, Infinity, -Infinity, '99', 14],
      temperature_2m_min: [null, undefined, -3, NaN, Infinity, -Infinity, false, 5],
      temperature_2m_mean: [null, undefined, NaN, Infinity, -Infinity, '50', 0, 10],
    }) }), ['14.0', '-3.0', '5.0']);
  });

  it('ignores extra entries and skips missing entries in short arrays', () => {
    expectStats(markup({ data: { daily: {
      ...week,
      temperature_2m_max: [10, 23, 18, 100],
      temperature_2m_min: [4, -2, 7, -100],
      temperature_2m_mean: [6, 12, 15, 100],
    } } }), ['23.0', '-2.0', '11.0']);
    expectStats(markup({ data: { daily: {
      ...week, temperature_2m_max: [0], temperature_2m_min: [-1], temperature_2m_mean: [2, 4],
    } } }), ['0.0', '-1.0', '3.0']);
  });

  it.each(['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean'] as const)(
    'shows a dash independently for empty %s', (key) => {
      for (const missing of [undefined, [], [null, undefined, NaN]]) {
        const expected = ['23.0', '-2.0', '11.0'];
        expected[['temperature_2m_max', 'temperature_2m_min', 'temperature_2m_mean'].indexOf(key)] = '-';
        expectStats(markup({ data: apiData({ ...week, [key]: missing }) }), expected);
      }
    },
  );

  it('keeps the container when every statistic is unavailable', () => {
    expectStats(markup({ data: { daily: { time: week.time } } }), ['-', '-', '-']);
    expectStats(markup({ data: apiData({
      time: week.time,
      temperature_2m_max: [null, undefined, NaN],
      temperature_2m_min: [Infinity, -Infinity],
      temperature_2m_mean: [],
    }) }), ['-', '-', '-']);
  });

  it('places statistics after the chart, outside LineChart', () => {
    const tree = WeatherChart({ period: '7d', metric: 'temperature', tempUnit: 'C', data });
    const children = Children.toArray(tree?.props.children);
    const chartIndex = children.findIndex((child) => !!findLineChart(child));
    const statsIndex = children.findIndex((child) =>
      isValidElement<{ 'data-testid'?: string }>(child)
      && child.props['data-testid'] === 'weekly-temp-stats');
    expect(chartIndex).toBeGreaterThanOrEqual(0);
    expect(statsIndex).toBeGreaterThan(chartIndex);
  });

  it('requests daily mean temperature only in the seven-day URL', () => {
    const weekly = new URL(buildUrl(35, 139, '7d')).searchParams;
    expect(weekly.get('daily')?.split(',')).toContain('temperature_2m_mean');
    expect(weekly.get('forecast_days')).toBe('7');
    const hourly = new URL(buildUrl(35, 139, '48h')).searchParams;
    expect(hourly.has('daily')).toBe(false);
    expect(hourly.get('hourly')).toBe('temperature_2m,apparent_temperature,precipitation,wind_speed_10m');
    expect(hourly.get('forecast_days')).toBe('2');
  });
});
