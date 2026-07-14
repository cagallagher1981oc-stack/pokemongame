'use client';

import { useEffect } from 'react';
import { MILESTONES } from '@/lib/game-state';

interface Props {
  count: number;
  onClose: () => void;
}

export default function MilestonePopup({ count, onClose }: Props) {
  const milestone = MILESTONES[count];
  const isGrandChampion = count === 100;

  // Hooks must run unconditionally — the early return happens after
  useEffect(() => {
    if (!milestone || isGrandChampion) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [milestone, isGrandChampion, onClose]);

  if (!milestone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5, 5, 20, 0.75)', backdropFilter: 'blur(4px)' }}>
      <div
        className={`relative w-full max-w-sm rounded-3xl p-8 text-center card-glow`}
        style={
          isGrandChampion
            ? {
                background: 'linear-gradient(135deg, #1a1000, #2a1800)',
                border: '1px solid rgba(240, 192, 64, 0.5)',
                boxShadow: '0 0 30px rgba(240, 192, 64, 0.3), 0 0 60px rgba(240, 192, 64, 0.1)',
              }
            : {
                background: '#111532',
                border: '1px solid rgba(157, 53, 255, 0.4)',
              }
        }
      >
        <div className="text-5xl mb-3">{isGrandChampion ? '🏆' : '⭐'}</div>
        <h2
          className="text-2xl font-black mb-2 drop-shadow"
          style={{ color: isGrandChampion ? '#f0c040' : '#c8a8ff' }}
        >
          {milestone.title}
        </h2>
        <p className="font-semibold text-lg mb-4" style={{ color: isGrandChampion ? '#c8a060' : '#9d70cc' }}>
          {milestone.subtitle}
        </p>
        {milestone.refillLifelines && (
          <p className="font-bold text-sm mb-4" style={{ color: '#39eb8c' }}>
            ✨ All Trainer Tools refilled!
          </p>
        )}
        <button
          onClick={onClose}
          className="font-bold py-2 px-6 rounded-full transition-all hover:scale-105"
          style={
            isGrandChampion
              ? {
                  background: 'rgba(240, 192, 64, 0.15)',
                  border: '1px solid rgba(240, 192, 64, 0.4)',
                  color: '#f0c040',
                }
              : {
                  background: 'rgba(157, 53, 255, 0.15)',
                  border: '1px solid rgba(157, 53, 255, 0.4)',
                  color: '#c8a8ff',
                }
          }
        >
          Let&apos;s go!
        </button>
      </div>
    </div>
  );
}
