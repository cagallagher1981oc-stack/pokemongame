'use client';

import { Lifelines } from '@/lib/game-state';

interface Props {
  lifelines: Lifelines;
  activeLifelines: Set<keyof Lifelines>;
  onUse: (key: keyof Lifelines) => void;
}

const LIFELINE_META: { key: keyof Lifelines; label: string; icon: string; desc: string }[] = [
  { key: 'fiftyFifty', label: '50/50', icon: '✂️', desc: 'Remove 2 wrong answers' },
  { key: 'hint', label: 'Hint', icon: '💡', desc: 'Show a clue' },
  { key: 'typeReveal', label: 'Type', icon: '🔮', desc: "Reveal Pokémon's type" },
  { key: 'artistInsight', label: 'Unblur', icon: '👁️', desc: 'Reveal bottom half of card' },
  { key: 'evolutionChain', label: 'Evo', icon: '🧬', desc: 'Show evolution info' },
  { key: 'secondChance', label: '2nd', icon: '🛡️', desc: 'One free miss' },
  { key: 'skip', label: 'Skip', icon: '💨', desc: 'Skip card — no streak penalty' },
];

export default function LifelineBar({ lifelines, activeLifelines, onUse }: Props) {
  return (
    <div className="w-full">
      <p
        className="text-xs font-bold mb-2 uppercase tracking-widest"
        style={{ color: '#4a3a7a' }}
      >
        Trainer Tools
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {LIFELINE_META.map(({ key, label, icon, desc }) => {
          const count = lifelines[key];
          const isUsed = count === 0;
          const isActive = activeLifelines.has(key);

          let inlineStyle: React.CSSProperties;
          if (isActive) {
            inlineStyle = {
              background: 'rgba(57, 235, 140, 0.1)',
              border: '1px solid rgba(57, 235, 140, 0.5)',
              color: '#39eb8c',
            };
          } else if (isUsed) {
            inlineStyle = {
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.2)',
              opacity: 0.5,
              cursor: 'not-allowed',
            };
          } else {
            inlineStyle = {
              background: '#0d1240',
              border: '1px solid rgba(157, 53, 255, 0.3)',
              color: '#c8a8ff',
              cursor: 'pointer',
            };
          }

          return (
            <button
              key={key}
              onClick={() => !isUsed && !isActive && onUse(key)}
              disabled={isUsed || isActive}
              title={desc}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl text-xs font-bold transition-all ${
                !isUsed && !isActive ? 'hover:scale-105 active:scale-95' : ''
              }`}
              style={inlineStyle}
              onMouseEnter={(e) => {
                if (!isUsed && !isActive) {
                  e.currentTarget.style.border = '1px solid rgba(157, 53, 255, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(157, 53, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUsed && !isActive) {
                  e.currentTarget.style.border = '1px solid rgba(157, 53, 255, 0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="leading-tight mt-1 text-[11px]">{label}</span>
              <span
                className="text-[10px] rounded-full px-1.5 mt-1 font-bold"
                style={{
                  background: isActive
                    ? 'rgba(57, 235, 140, 0.2)'
                    : isUsed
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(157, 53, 255, 0.2)',
                  color: isActive ? '#39eb8c' : isUsed ? 'rgba(255,255,255,0.2)' : '#9d35ff',
                }}
              >
                {isUsed ? '—' : `×${count}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
