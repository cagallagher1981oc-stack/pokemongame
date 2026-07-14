'use client';

import { TARGET } from '@/lib/game-state';

interface Props {
  captured: number;
  score: number;
  streak: number;
  bestStreak: number;
  incorrectGuesses: number;
}

export default function ProgressBar({ captured, score, streak, bestStreak, incorrectGuesses }: Props) {
  const pct = Math.min((captured / TARGET) * 100, 100);

  return (
    <div
      className="w-full rounded-2xl p-4 card-glow"
      style={{
        background: '#111532',
        border: '1px solid rgba(157, 53, 255, 0.3)',
      }}
    >
      {/* Metrics row */}
      <div className="flex items-center justify-around mb-3">
        {/* Incorrect guesses — Red Pokéball */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-base leading-none"
            role="img"
            aria-label="incorrect guesses"
            title="Incorrect guesses"
          >
            🔴
          </span>
          <span className="text-sm font-bold tabular-nums" style={{ color: '#ff7a9a' }}>
            {incorrectGuesses}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 opacity-30" style={{ background: '#9d35ff' }} />

        {/* Score */}
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" role="img" aria-label="score">⭐</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: '#f0c040' }}>
            {score}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 opacity-30" style={{ background: '#9d35ff' }} />

        {/* Streak — flame heats up as it grows */}
        <div className="flex items-center gap-1.5">
          <span
            key={streak}
            className={`text-base leading-none ${streak > 1 ? 'streak-pop' : ''}`}
            role="img"
            aria-label="streak"
            title="Current streak"
          >
            🔥
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              color: streak >= 10 ? '#ffd23f' : streak >= 5 ? '#ff5c1a' : streak > 1 ? '#ff8c42' : '#4a4070',
              textShadow: streak >= 5 ? '0 0 8px rgba(255, 120, 40, 0.6)' : 'none',
            }}
          >
            ×{streak}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 opacity-30" style={{ background: '#9d35ff' }} />

        {/* Best streak */}
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none" role="img" aria-label="best streak" title="Best streak">🏅</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: '#9d70cc' }}>
            {bestStreak}
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#7a5aaa' }}>
          🎴 {captured}/{TARGET}
        </span>
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(157, 53, 255, 0.12)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #7b2fff, #c86fff)',
              boxShadow: pct > 0 ? '0 0 8px rgba(157, 53, 255, 0.65)' : 'none',
            }}
          />
        </div>
        <span className="text-xs font-semibold" style={{ color: '#7a5aaa' }}>captured</span>
      </div>
    </div>
  );
}
