'use client';

export default function BackgroundBlobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 左上パープル */}
      <div className="absolute -top-32 -left-32 w-[38rem] h-[38rem] rounded-full
                      bg-fuchsia-600/25 blur-3xl" />
      {/* 右上ブルー */}
      <div className="absolute -top-40 right-0 w-[46rem] h-[46rem] rounded-full
                      bg-cyan-500/20 blur-3xl" />
      {/* 右下ディープブルー */}
      <div className="absolute -bottom-40 -right-20 w-[42rem] h-[42rem] rounded-full
                      bg-indigo-700/25 blur-3xl" />
      {/* 中央の放射グラデ（薄く） */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_35%,rgba(255,255,255,0.08),rgba(0,0,0,0))]" />
    </div>
  );
}
