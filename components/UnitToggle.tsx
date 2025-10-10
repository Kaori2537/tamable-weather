'use client';
import type { TempUnit } from '../lib/units';
type Props = { value: TempUnit; onChange:(u:TempUnit)=>void };

export default function UnitToggle({ value, onChange }: Props) {
  const base = 'w-full px-4 py-2 rounded-xl border border-[var(--border)] text-sm';
  const onPink = 'bg-[var(--accent)] text-white';
  const off = 'bg-[var(--inactive)] text-gray-200';
  return (
    <div className="w-full">
      <p className="text-xs font-medium text-[var(--subtitle)] mb-1 flex items-center gap-1">
        <span>🌡️</span> 単位
      </p>
      <div role="group" aria-label="温度単位を選択" className="grid grid-cols-2 gap-2">
        <button 
          className={`${base} ${value==='C'?onPink:off}`} 
          onClick={()=>onChange('C')}
          aria-pressed={value === 'C'}
        >
          °C
        </button>
        <button 
          className={`${base} ${value==='F'?onPink:off}`} 
          onClick={()=>onChange('F')}
          aria-pressed={value === 'F'}
        >
          °F
        </button>
      </div>
    </div>
  );
}
