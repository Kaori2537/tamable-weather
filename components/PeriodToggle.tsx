'use client';
type Props = { value:'48h'|'7d'; onChange:(v:'48h'|'7d')=>void };

export default function PeriodToggle({ value, onChange }: Props) {
  const base = 'w-full px-4 py-2 rounded-xl border border-[var(--border)] text-sm';
  const active = 'bg-[var(--primary)] text-white';
  const idle = 'bg-[var(--inactive)] text-gray-200';
  return (
    <div className="w-full">
      <p className="text-xs font-medium text-[var(--subtitle)] mb-1 flex items-center gap-1">
        <span>⏰</span> 期間
      </p>
      <div role="group" aria-label="期間を選択" className="grid grid-cols-2 gap-2">
        <button 
          className={`${base} ${value==='48h'?active:idle}`} 
          onClick={()=>onChange('48h')}
          aria-pressed={value === '48h'}
        >
          48時間
        </button>
        <button 
          className={`${base} ${value==='7d'?active:idle}`} 
          onClick={()=>onChange('7d')}
          aria-pressed={value === '7d'}
        >
          7日間
        </button>
      </div>
    </div>
  );
}
