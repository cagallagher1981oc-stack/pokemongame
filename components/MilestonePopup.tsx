'use client';

import { useEffect } from 'react';
import { MILESTONES } from '@/lib/game-state';

interface Props {
  count: number;
  onClose: () => void;
}

export default function MilestonePopup({ count, onClose }: Props) {
  const milestone = MILESTONES[count];
  if (!milestone) return null;

  const isGrandChampion = count === 100;

  useEffect(() => {
    if (!isGrandChampion) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [isGrandChampion, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`relative w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl ${
          isGrandChampion
            ? 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600'
        }`}
      >
        <div className="text-5xl mb-3">{isGrandChampion ? '🏆' : '⭐'}</div>
        <h2 className="text-2xl font-black text-white drop-shadow mb-2">{milestone.title}</h2>
        <p className="text-white/90 font-semibold text-lg mb-4">{milestone.subtitle}</p>
        {milestone.refillLifelines && (
          <p className="text-yellow-200 font-bold text-sm mb-4">
            ✨ All Trainer Tools refilled!
          </p>
        )}
        <button
          onClick={onClose}
          className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-6 rounded-full transition-colors"
        >
          Let&apos;s go!
        </button>
      </div>
    </div>
  );
}
