// lib/units.ts
export type TempUnit = 'C' | 'F';

export const toF = (c: number) => (c * 9) / 5 + 32;

export function convertTemp(v: number | undefined, unit: TempUnit) {
  if (v == null) return v;
  return unit === 'F' ? Math.round(toF(v) * 10) / 10 : v;
}

export function unitLabelTemp(unit: TempUnit) {
  return unit === 'F' ? '°F' : '°C';
}
