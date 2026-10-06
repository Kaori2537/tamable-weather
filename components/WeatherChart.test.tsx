import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildUrl } from '../lib/openMeteo';
import { Area, Line, ComposedChart, Tooltip } from 'recharts';
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

function findComposedChart(node: ReactNode): ElementWithChildren | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === ComposedChart) return node;

  let result: ElementWithChildren | undefined;
  Children.forEach(node.props.children, (child) => {
    result ??= findComposedChart(child);
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
    'passes %s %s series directly to ComposedChart',
    (period, metric, expectedDataKeys) => {
      const chart = WeatherChart({ period, metric, tempUnit: 'C', data });
      const lineChart = findComposedChart(chart);

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


// Multiple valid points give every series a non-degenerate filled area.
const drawingData = {
  hourly: {
    time: ['2025-01-01T00:00:00', '2025-01-01T06:00:00', '2025-01-01T12:00:00'],
    temperature_2m: [10, 12, 14],
    apparent_temperature: [8, 10, 12],
    precipitation: [1, 2, 3],
    windspeed_10m: [2, 3, 4],
  },
  daily: {
    time: ['2025-01-01', '2025-01-02', '2025-01-03'],
    temperature_2m_max: [12, 14, 16],
    temperature_2m_min: [4, 6, 8],
    apparent_temperature_max: [10, 12, 14],
    apparent_temperature_min: [2, 4, 6],
    precipitation_sum: [3, 4, 5],
    windspeed_10m_max: [5, 6, 7],
  },
};

describe('WeatherChart rendered gradients', () => {
  it.each(cases)('renders filled areas without outlines for %s %s', (period, metric, keys) => {
    const chart = findComposedChart(WeatherChart({ period, metric, tempUnit: 'C', data: drawingData }));
    expect(chart).toBeDefined();
    const expected = period === '48h'
      ? [[keys[0], 'url(#area48h)'], [keys[0], 'url(#band48h)']]
      : metric === 'temperature' || metric === 'apparent'
        ? [[keys[0], 'url(#area7dMax)'], [keys[1], 'url(#area7dMin)']]
        : [[keys[0], 'url(#area48h)']];
    const areas = Children.toArray(chart!.props.children).filter(
      (child) => isValidElement(child) && child.type === Area,
    ) as ReactElement<{ dataKey: string; fill: string; stroke: string }>[];
    expect(areas.map(({ props }) => [props.dataKey, props.fill])).toEqual(expected);
    expect(areas.map(({ props }) => props.stroke)).toEqual(expected.map(() => 'none'));

    // Render the actual WeatherChart container outside ResponsiveContainer,
    // supplying dimensions only in the test. Recharts itself renders the paths.
    const sizedChart = cloneElement(chart! as ReactElement<{ width: number; height: number }>, {
      width: 640, height: 300,
    });
    const html = renderToStaticMarkup(sizedChart);
    const paths = (html.match(/<path\b[^>]*>/g) ?? []).filter(
      (path) => /class="[^"]*\brecharts-area-area\b[^"]*"/.test(path),
    );
    expect(paths.map((path) => path.match(/\bfill="([^"]*)"/)?.[1]))
      .toEqual(expected.map(([, fill]) => fill));
    for (const path of paths) {
      expect(path).toMatch(/\bstroke="none"/);
      expect(path).toMatch(/\bd="[^"]+"/);
    }
    expect(html).not.toContain('recharts-area-curve');
  });
});

describe('WeatherChart tooltip with Area payload entries', () => {
  it.each(cases)('preserves labels and values for %s %s', (period, metric, keys) => {
    const chart = findComposedChart(WeatherChart({ period, metric, tempUnit: 'C', data: drawingData }));
    const tooltip = Children.toArray(chart!.props.children).find(
      (child) => isValidElement(child) && child.type === Tooltip,
    ) as ReactElement<{ content: ReactElement<{
      active: boolean; label: string;
      payload: { dataKey: string; value: number; type: string }[];
    }> }>;
    const values: Record<string, number> = {
      temperature: 10, apparent: 8, precip: period === '48h' ? 1 : 3,
      wind: period === '48h' ? 2 : 5, max: 12, min: 4, appMax: 10, appMin: 2,
    };
    // ComposedChart adds Area entries to the payload alongside Line entries with
    // the same dataKey. Put all Area entries first, including both overlapping
    // fills in 48h, followed by the Line entries.
    const areaKeys = period === '48h' ? [keys[0], keys[0]] : [...keys];
    const payload = [...areaKeys, ...keys].map((dataKey) => ({
      dataKey, value: values[dataKey], type: 'line',
    }));
    const html = renderToStaticMarkup(cloneElement(tooltip.props.content, {
      active: true, label: '2025-01-01T06:00:00', payload,
    }));
    const text = html.replace(/<[^>]*>/g, '');
    const expectedDate = period === '48h' ? '01/01 06:00' : '01/01 00:00';
    if (period === '7d' && (metric === 'temperature' || metric === 'apparent')) {
      expect(text).toBe(`${expectedDate}最高(°C)：${values[keys[0]]}最低(°C)：${values[metric === 'temperature' ? 'min' : 'appMin']}`);
    } else {
      const label = { temperature: '気温', apparent: '体感温度', precip: '降水量', wind: '風速' }[metric];
      const unit = metric === 'precip' ? 'mm' : metric === 'wind' ? 'm/s' : '°C';
      expect(text).toBe(`${expectedDate}${label}(${unit})：${values[keys[0]]}`);
    }
  });
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

  it('places statistics after the chart, outside ComposedChart', () => {
    const tree = WeatherChart({ period: '7d', metric: 'temperature', tempUnit: 'C', data });
    const children = Children.toArray(tree?.props.children);
    const chartIndex = children.findIndex((child) => !!findComposedChart(child));
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
