import './globals.css';

export const metadata = {
  title: 'Weather Forecast',
  description: 'リアルタイム天気予報ダッシュボード',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      {/* ← 二色グラデだけ。ほかは何も重ねない */}
      <body className="min-h-screen bg-gradient-to-br from-[var(--bg-grad-from)] to-[var(--bg-grad-to)] text-white">
        {children}
      </body>
    </html>
  );
}
