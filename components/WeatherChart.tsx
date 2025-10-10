// components/WeatherChart.tsx
'use client';

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Area
} from 'recharts';
import { format, parseISO } from 'date-fns';

import type { TempUnit } from '../lib/units';
import { convertTemp, unitLabelTemp } from '../lib/units';

type Metric = 'temperature' | 'apparent' | 'precip' | 'wind';
type WeatherData = {
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    precipitation?: number[];
    windspeed_10m?: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    apparent_temperature_min?: number[];
    precipitation_sum?: number[];
    windspeed_10m_max?: number[];
  };
};

type TooltipPayload = {
  dataKey: string;
  value: number;
  type: string;
};

type Props = { 
  period:'48h'|'7d'; 
  metric:Metric; 
  tempUnit:TempUnit; 
  data: WeatherData;
};

type Row = {
  ts: string;
  x?: string;
  // 48h
  temperature?: number;
  apparent?: number;
  precip?: number;
  wind?: number;
  // 7d
  min?: number;
  max?: number;
  appMin?: number;
  appMax?: number;
};

export default function WeatherChart({ period, metric, tempUnit, data }: Props) {
  if (!data) return null;

  let rows: Row[] = [];
  let ticks: string[] = [];

  if (period === '48h' && data.hourly?.time) {
    const t = data.hourly;
    rows = t.time.map((iso: string, i: number) => ({
      ts: iso,
      x:  format(parseISO(iso), 'MM/dd HH:mm'),
      temperature: convertTemp(t.temperature_2m?.[i], tempUnit),
      apparent:    convertTemp(t.apparent_temperature?.[i], tempUnit),
      precip:      t.precipitation?.[i],
      wind:        t.windspeed_10m?.[i],
    }));
    ticks = t.time.filter((iso: string) => new Date(iso).getHours() % 6 === 0);
  } else if (period === '7d' && data.daily?.time) {
    const d = data.daily;
    rows = d.time.map((iso: string, i: number) => ({
      ts: iso,
      x:  format(parseISO(iso), 'MM/dd 00:00'),
      max:    d.temperature_2m_max?.[i] != null ? convertTemp(d.temperature_2m_max[i], tempUnit) : undefined,
      min:    d.temperature_2m_min?.[i] != null ? convertTemp(d.temperature_2m_min[i], tempUnit) : undefined,
      appMax: d.apparent_temperature_max?.[i] != null ? convertTemp(d.apparent_temperature_max[i], tempUnit) : undefined,
      appMin: d.apparent_temperature_min?.[i] != null ? convertTemp(d.apparent_temperature_min[i], tempUnit) : undefined,
      precip: d.precipitation_sum?.[i],
      wind:   d.windspeed_10m_max?.[i],
    }));
    ticks = d.time.slice();
  }

  const metricLabelJa =
    metric === 'temperature' ? '気温' :
    metric === 'apparent'    ? '体感温度' :
    metric === 'precip'      ? '降水量'   : '風速';

  const unitByMetric =
    metric === 'precip' ? 'mm' :
    metric === 'wind'   ? 'm/s' :
    unitLabelTemp(tempUnit);

  const titleText = `${metricLabelJa}(${unitByMetric})`;

  const yTicks = (metric === 'temperature' || metric === 'apparent')
    ? [0, 8, 16, 24, 32]
    : undefined;

  const dataKey48h =
    metric === 'temperature' ? 'temperature' :
    metric === 'apparent'    ? 'apparent'    :
    metric === 'precip'      ? 'precip'      : 'wind';

  // ★ ツールチップ：7日間のときは温度系で Max/Min を両方表示
  const CustomTooltip = ({ active, label, payload }: {
    active?: boolean;
    label?: string;
    payload?: TooltipPayload[];
  }) => {
    if (!active || !payload?.length) return null;

    const ts = format(parseISO(String(label)), 'MM/dd 00:00');

    // 7d & 温度系 → 両方表示
    if (period === '7d' && (metric === 'temperature' || metric === 'apparent')) {
      // dataKey を探す
      const maxKey = metric === 'temperature' ? 'max' : 'appMax';
      const minKey = metric === 'temperature' ? 'min' : 'appMin';
      const maxP = payload.find((p: TooltipPayload) => p.dataKey === maxKey);
      const minP = payload.find((p: TooltipPayload) => p.dataKey === minKey);
      return (
        <div className="rounded-md bg-white/95 text-gray-800 shadow px-3 py-2">
          <div className="text-sm font-medium">{ts}</div>
          <div className="text-sm mt-1">最高({unitByMetric})：{maxP?.value ?? '-'}</div>
          <div className="text-sm">最低({unitByMetric})：{minP?.value ?? '-'}</div>
        </div>
      );
    }

    // それ以外（48h または 降水量/風速）は単一値
    const primary = payload.find((p: TooltipPayload) => p.type === 'line') ?? payload[0];
    return (
      <div className="rounded-md bg-white/95 text-gray-800 shadow px-3 py-2">
        <div className="text-sm font-medium">
          {period === '48h' ? format(parseISO(String(label)), 'MM/dd HH:mm') : ts}
        </div>
        <div className="text-sm mt-1">
          {metricLabelJa}({unitByMetric})：{primary?.value}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="px-6 pt-3 pb-1">
        <p className="text-cyan-300 font-bold tracking-wide text-[18px]">{titleText}</p>
      </div>

      <div className="w-full h-[300px]">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 28, bottom: 64, left: 28 }}>
            <defs>
              {/* 48h：メイン塗り */}
              <linearGradient id="area48h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-line)" stopOpacity="0.30" />
                <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.00" />
              </linearGradient>
              {/* 48h：ライン直下の帯 */}
              <linearGradient id="band48h" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="rgb(255, 196, 102)" stopOpacity="0.55" />
                <stop offset="12%" stopColor="rgb(255, 196, 102)" stopOpacity="0.00" />
              </linearGradient>
              {/* 7d：温度系の淡い塗り */}
              <linearGradient id="area7dMax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--chart-line)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.00" />
              </linearGradient>
              <linearGradient id="area7dMin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--chart-line)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--chart-line)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.08)" />

            <XAxis
              dataKey="ts"
              ticks={ticks}
              interval={0}
              tickFormatter={(iso: string) => format(parseISO(iso), 'MM/dd HH:mm')}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              angle={-35}
              textAnchor="end"
              height={64}
              minTickGap={14}
            />

            <YAxis
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              ticks={yTicks}
              width={48}
              label={{
                value: unitByMetric,
                angle: -90,
                position: 'insideLeft',
                offset: -6,
                style: { fill: '#9ec8ff', fontSize: 13, fontWeight: 'bold' },
              }}
            />

            <Tooltip content={<CustomTooltip />} cursor={false} />

            {/* 48時間 */}
            {period === '48h' && (
              <>
                <Area type="monotone" dataKey={dataKey48h} fill="url(#area48h)" stroke="none" />
                <Area type="monotone" dataKey={dataKey48h} fill="url(#band48h)" stroke="none" />
                <Line
                  type="monotone"
                  dataKey={dataKey48h}
                  stroke="var(--chart-line)"
                  strokeWidth={2}
                  dot={{ stroke: 'var(--chart-dot)', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </>
            )}

            {/* 7日間：指標ごとに出し分け */}
            {period === '7d' && metric === 'temperature' && (
              <>
                <Area type="monotone" dataKey="max" fill="url(#area7dMax)" stroke="none" />
                <Area type="monotone" dataKey="min" fill="url(#area7dMin)" stroke="none" />
                <Line type="monotone" dataKey="max" stroke="var(--chart-line)" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="min" stroke="var(--chart-line)" strokeDasharray="6 4" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
              </>
            )}

            {period === '7d' && metric === 'apparent' && (
              <>
                <Area type="monotone" dataKey="appMax" fill="url(#area7dMax)" stroke="none" />
                <Area type="monotone" dataKey="appMin" fill="url(#area7dMin)" stroke="none" />
                <Line type="monotone" dataKey="appMax" stroke="var(--chart-line)" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="appMin" stroke="var(--chart-line)" strokeDasharray="6 4" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
              </>
            )}

            {period === '7d' && metric === 'precip' && (
              <>
                <Area type="monotone" dataKey="precip" fill="url(#area48h)" stroke="none" />
                <Line type="monotone" dataKey="precip" stroke="var(--chart-line)" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
              </>
            )}

            {period === '7d' && metric === 'wind' && (
              <>
                <Area type="monotone" dataKey="wind" fill="url(#area48h)" stroke="none" />
                <Line type="monotone" dataKey="wind" stroke="var(--chart-line)" strokeWidth={2}
                      dot={{ r: 3, stroke: 'var(--chart-dot)', strokeWidth: 2 }} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center mt-1 text-[13px] text-amber-300/90">
        {titleText}
      </div>
    </div>
  );
}
