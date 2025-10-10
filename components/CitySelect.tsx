'use client';
import { cities as baseCities, City } from '../lib/cities';

type Props = { 
  value: City; 
  onChange: (c: City) => void;
  cities?: City[];
  savedCities?: City[];
  onRemoveCity?: (c: City) => void;
};

export default function CitySelect({ value, onChange, cities, savedCities = [], onRemoveCity }: Props) {
  const list = cities ?? baseCities;
  
  return (
    <div className="w-full">
      <p className="text-xs font-medium text-[var(--subtitle)] mb-1 flex items-center gap-1">
        <span>🗂️</span> 都市を選択
      </p>
      <div className="relative">
      <select
        className="w-full px-3 py-2 pr-12 rounded-xl border border-[var(--border)]
                   bg-white/10 text-white backdrop-blur-sm
                   focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/60"
        value={value.label}
        onChange={(e) => {
          const next = list.find((x) => x.label === e.target.value)!;
          onChange(next);
        }}
        aria-label="都市を選択"
      >
          {baseCities.map((c) => (
            <option key={c.label} value={c.label} className="bg-[var(--card)] text-white">
              {c.label}
            </option>
          ))}
          {savedCities.map((c) => (
            <option key={c.label} value={c.label} className="bg-[var(--card)] text-white">
              {c.label}
            </option>
          ))}
        </select>
        
        {/* 保存された都市の削除ボタン */}
        {savedCities.some(c => c.label === value.label) && onRemoveCity && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onRemoveCity(value);
            }}
            className="absolute right-8 top-1/2 transform -translate-y-1/2
                       w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40
                       text-red-300 hover:text-red-200 transition-colors
                       flex items-center justify-center text-xs"
            title="この都市を削除"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
