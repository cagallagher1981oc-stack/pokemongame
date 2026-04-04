'use client';

import { TARGET } from '@/lib/game-state';

interface Props {
  captured: number;
  score: number;
  streak: number;
}

export default function ProgressBar({ captured, score, streak }: Props) {
  const pct = Math.min((captured / TARGET) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-sm font-bold text-indigo-900">
        <span>🎴 {captured}/{TARGET} captured</span>
        <span className="flex gap-3">
          <span>⭐ {score}</span>
          {streak > 1 && <span className="text-orange-500">🔥 ×{streak}</span>}
        </span>
      </div>
      <div className="h-4 bg-indigo-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
