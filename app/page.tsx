'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect } from 'react';
import CitySelect from '../components/CitySelect';
import MetricSelect, { Metric } from '../components/MetricSelect';
import PeriodToggle from '../components/PeriodToggle';
import UnitToggle from '../components/UnitToggle';
import WeatherChart from '../components/WeatherChart';
import { cities, City } from '../lib/cities';
import { buildUrl } from '../lib/openMeteo';
import type { TempUnit } from '../lib/units';

// 座標から県名を判定する関数（県・府・都・道なし）
function getPrefectureName(lat: number, lon: number): string {
  const prefectures = [
    { name: '北海道', latMin: 41.0, latMax: 45.5, lonMin: 139.0, lonMax: 145.0 },
    { name: '青森', latMin: 40.0, latMax: 41.5, lonMin: 139.0, lonMax: 141.5 },
    { name: '岩手', latMin: 38.5, latMax: 40.5, lonMin: 140.5, lonMax: 142.0 },
    { name: '宮城', latMin: 37.5, latMax: 39.0, lonMin: 140.0, lonMax: 142.0 },
    { name: '秋田', latMin: 39.0, latMax: 40.5, lonMin: 139.5, lonMax: 141.0 },
    { name: '山形', latMin: 37.5, latMax: 39.0, lonMin: 139.5, lonMax: 140.5 },
    { name: '福島', latMin: 36.8, latMax: 38.0, lonMin: 139.5, lonMax: 142.5 },
    { name: '茨城', latMin: 35.5, latMax: 36.5, lonMin: 139.5, lonMax: 141.0 },
    { name: '栃木', latMin: 36.0, latMax: 37.0, lonMin: 139.5, lonMax: 140.5 },
    { name: '群馬', latMin: 36.0, latMax: 37.0, lonMin: 138.5, lonMax: 139.5 },
    { name: '埼玉', latMin: 35.5, latMax: 36.5, lonMin: 138.5, lonMax: 139.5 },
    { name: '千葉', latMin: 35.0, latMax: 36.0, lonMin: 139.5, lonMax: 141.0 },
    { name: '東京', latMin: 35.5, latMax: 36.0, lonMin: 138.5, lonMax: 140.0 },
    { name: '神奈川', latMin: 35.0, latMax: 35.5, lonMin: 138.5, lonMax: 139.5 },
    { name: '新潟', latMin: 36.5, latMax: 38.5, lonMin: 137.5, lonMax: 139.5 },
    { name: '富山', latMin: 36.0, latMax: 37.0, lonMin: 136.5, lonMax: 137.5 },
    { name: '石川', latMin: 36.0, latMax: 37.5, lonMin: 136.0, lonMax: 137.5 },
    { name: '福井', latMin: 35.5, latMax: 36.5, lonMin: 135.5, lonMax: 136.5 },
    { name: '山梨', latMin: 35.0, latMax: 36.0, lonMin: 138.0, lonMax: 139.0 },
    { name: '長野', latMin: 35.0, latMax: 37.0, lonMin: 137.5, lonMax: 139.0 },
    { name: '岐阜', latMin: 35.0, latMax: 36.5, lonMin: 136.5, lonMax: 137.5 },
    { name: '静岡', latMin: 34.5, latMax: 35.5, lonMin: 137.5, lonMax: 139.0 },
    { name: '愛知', latMin: 34.5, latMax: 35.5, lonMin: 136.5, lonMax: 137.5 },
    { name: '三重', latMin: 33.5, latMax: 35.0, lonMin: 135.5, lonMax: 136.5 },
    { name: '滋賀', latMin: 35.0, latMax: 35.5, lonMin: 135.5, lonMax: 136.5 },
    { name: '京都', latMin: 34.5, latMax: 35.5, lonMin: 135.0, lonMax: 136.0 },
    { name: '大阪', latMin: 34.0, latMax: 35.0, lonMin: 135.0, lonMax: 135.5 },
    { name: '兵庫', latMin: 34.0, latMax: 35.5, lonMin: 134.5, lonMax: 135.5 },
    { name: '奈良', latMin: 34.0, latMax: 35.0, lonMin: 135.5, lonMax: 136.5 },
    { name: '和歌山', latMin: 33.5, latMax: 34.5, lonMin: 135.0, lonMax: 136.0 },
    { name: '鳥取', latMin: 35.0, latMax: 35.5, lonMin: 133.5, lonMax: 134.5 },
    { name: '島根', latMin: 34.5, latMax: 35.5, lonMin: 131.5, lonMax: 134.0 },
    { name: '岡山', latMin: 34.5, latMax: 35.5, lonMin: 133.5, lonMax: 134.5 },
    { name: '広島', latMin: 34.0, latMax: 35.0, lonMin: 132.0, lonMax: 133.5 },
    { name: '山口', latMin: 33.5, latMax: 34.5, lonMin: 130.5, lonMax: 132.0 },
    { name: '徳島', latMin: 33.5, latMax: 34.5, lonMin: 133.5, lonMax: 134.5 },
    { name: '香川', latMin: 34.0, latMax: 34.5, lonMin: 133.5, lonMax: 134.5 },
    { name: '愛媛', latMin: 33.0, latMax: 34.5, lonMin: 132.5, lonMax: 133.5 },
    { name: '高知', latMin: 32.5, latMax: 34.0, lonMin: 132.5, lonMax: 134.0 },
    { name: '福岡', latMin: 33.0, latMax: 34.0, lonMin: 130.0, lonMax: 131.0 },
    { name: '佐賀', latMin: 33.0, latMax: 34.0, lonMin: 129.5, lonMax: 130.5 },
    { name: '長崎', latMin: 32.5, latMax: 34.5, lonMin: 128.5, lonMax: 130.5 },
    { name: '熊本', latMin: 32.0, latMax: 33.5, lonMin: 130.0, lonMax: 131.5 },
    { name: '大分', latMin: 32.5, latMax: 34.0, lonMin: 130.5, lonMax: 132.0 },
    { name: '宮崎', latMin: 31.5, latMax: 33.0, lonMin: 130.5, lonMax: 132.0 },
    { name: '鹿児島', latMin: 30.5, latMax: 32.5, lonMin: 129.5, lonMax: 131.5 },
    { name: '沖縄', latMin: 24.0, latMax: 26.5, lonMin: 123.0, lonMax: 128.0 },
  ];

  for (const pref of prefectures) {
    if (lat >= pref.latMin && lat <= pref.latMax && 
        lon >= pref.lonMin && lon <= pref.lonMax) {
      return pref.name;
    }
  }
  return '現在地';
}

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const SAVED_CITIES_KEY = 'tw:saved-cities:v1';

export default function Page() {
  const [city, setCity] = useState<City>(cities[0]);
  const [period, setPeriod] = useState<'48h' | '7d'>('48h');
  const [metric, setMetric] = useState<Metric>('temperature');
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');
  const [savedCities, setSavedCities] = useState<City[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  // --- 保存された都市の復元 ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(SAVED_CITIES_KEY);
      if (saved) setSavedCities(JSON.parse(saved));
    } catch (e) {
      console.error('都市リスト復元エラー:', e);
    }
  }, []);

  // --- 保存された都市の永続化 ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (savedCities.length === 0) {
        localStorage.removeItem(SAVED_CITIES_KEY);
      } else {
        localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(savedCities));
      }
    } catch (e) {
      console.error('都市リスト保存エラー:', e);
    }
  }, [savedCities]);

  // --- 現在地取得 ---
  const getCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const prefName = getPrefectureName(latitude, longitude);
        const newCity = { label: prefName, lat: latitude, lon: longitude };
        
        setSavedCities(prev => {
          if (prev.some(c => c.label === prefName)) return prev;
          return [...prev, newCity];
        });
        setCity(newCity);
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
        alert('位置情報の取得に失敗しました');
      }
    );
  };

  // --- 都市削除 ---
  const removeSavedCity = (cityToRemove: City) => {
    setSavedCities(prev => prev.filter(c => c.label !== cityToRemove.label));
    // 削除した都市が選択されていた場合、デフォルトに戻す
    if (city.label === cityToRemove.label) {
      setCity(cities[0]);
    }
  };

  // --- 全都市リスト ---
  const allCities: City[] = useMemo(() => [...cities, ...savedCities], [savedCities]);

  // 7日間でも選んだ metric をそのまま使う
  const effectiveMetric: Metric = metric;

  const url = useMemo(() => buildUrl(city.lat, city.lon, period), [city, period]);
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000, // 5秒間の重複リクエストを防ぐ
    errorRetryCount: 3, // エラー時のリトライ回数を制限
    errorRetryInterval: 1000, // リトライ間隔を1秒に設定
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <header className="text-center space-y-1">
        <h1 className="text-5xl font-extrabold tracking-wide text-[var(--title)]">
          Weather Forecast
        </h1>
        <p className="text-[var(--subtitle)]">リアルタイム天気予報ダッシュボード</p>
      </header>

      <section className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2 max-[520px]:grid-cols-1">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <CitySelect value={city} onChange={setCity} cities={allCities} savedCities={savedCities} onRemoveCity={removeSavedCity} />
            </div>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="h-[38px] px-3 rounded-xl bg-[var(--accent)] text-white transition hover:bg-[var(--accent-h)] disabled:opacity-50"
              title="現在地の天気を取得"
            >
              {locationLoading ? '📡' : '📍'}
            </button>
          </div>
          <MetricSelect value={metric} onChange={setMetric} />
          <PeriodToggle value={period} onChange={setPeriod} />
          <UnitToggle value={tempUnit} onChange={setTempUnit} />
        </div>
      </section>

      {isLoading && (
        <div className="p-5 text-center rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow">
          読み込み中…
        </div>
      )}

      {error && (
        <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow space-y-2">
          <p className="text-red-300 font-medium">
            {error.message?.includes('429') || error.message?.includes('rate') 
              ? 'リクエスト制限に達しました。しばらく待ってから再試行してください。'
              : 'エラーが発生しました。ネットワークをご確認の上、再試行してください。'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-h)] text-white"
            >
              再試行
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gray-600 hover:bg-gray-700 text-white"
            >
              ページリロード
            </button>
          </div>
        </div>
      )}

      {data && (
        <section className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-xl">
          <WeatherChart
            period={period}
            metric={effectiveMetric}
            tempUnit={tempUnit}
            data={data}
          />
          <div className="mt-2 text-center text-xs text-gray-400">
            データ提供: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Open-Meteo</a>
          </div>
        </section>
      )}
    </main>
  );
}
