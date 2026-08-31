import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
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
