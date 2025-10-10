export type City = {
  label: string;
  lat: number;
  lon: number;
};

export const cities: readonly City[] = [
  { label: '東京', lat: 35.6895, lon: 139.6917 },
  { label: '大阪', lat: 34.6937, lon: 135.5023 },
  { label: '札幌', lat: 43.0621, lon: 141.3544 },
  { label: '福岡', lat: 33.5904, lon: 130.4017 },
  { label: '那覇', lat: 26.2124, lon: 127.6809 },
];
