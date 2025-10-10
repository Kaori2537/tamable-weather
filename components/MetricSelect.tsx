'use client';

export type Metric = 'temperature' | 'apparent' | 'precip' | 'wind';
type Props = { value: Metric; onChange: (m: Metric) => void; disabled?: boolean };

export default function MetricSelect({ value, onChange, disabled }: Props) {
  return (
    <div className="w-full">
      <p className="text-xs font-medium text-[var(--subtitle)] mb-1 flex items-center gap-1">
        <span>📊</span> 指標を選択
      </p>
      <select
        className="select-dark w-full px-3 py-2 rounded-xl border border-[var(--border)]
                   bg-white/10 text-white backdrop-blur-sm
                   disabled:opacity-50
                   focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/60"
        value={value}
        onChange={(e) => onChange(e.target.value as Metric)}
        disabled={disabled}
        aria-label="指標を選択"
      >
        <option value="temperature" className="bg-[var(--card)] text-white">気温</option>
        <option value="apparent"    className="bg-[var(--card)] text-white">体感温度</option>
        <option value="precip"      className="bg-[var(--card)] text-white">降水量</option>
        <option value="wind"        className="bg-[var(--card)] text-white">風速</option>
      </select>
    </div>
  );
}
