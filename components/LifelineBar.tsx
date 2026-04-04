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
  { key: 'artistInsight', label: 'Unblur', icon: '👁️', desc: 'Reduce card blur' },
  { key: 'evolutionChain', label: 'Evo', icon: '🧬', desc: 'Show evolution info' },
  { key: 'secondChance', label: '2nd Chance', icon: '🛡️', desc: 'One free miss' },
];

export default function LifelineBar({ lifelines, activeLifelines, onUse }: Props) {
  return (
    <div className="w-full">
      <p className="text-xs font-bold text-indigo-900 mb-2 uppercase tracking-wide">Trainer Tools</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {LIFELINE_META.map(({ key, label, icon, desc }) => {
          const count = lifelines[key];
          const isUsed = count === 0;
          const isActive = activeLifelines.has(key);

          return (
            <button
              key={key}
              onClick={() => !isUsed && !isActive && onUse(key)}
              disabled={isUsed || isActive}
              title={desc}
              className={`flex flex-col items-center justify-center p-2 rounded-2xl border-2 text-xs font-bold transition-all ${
                isActive
                  ? 'border-green-400 bg-green-100 text-green-700'
                  : isUsed
                  ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed'
                  : 'border-indigo-300 bg-white text-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 active:scale-95'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span className="leading-tight mt-0.5">{label}</span>
              {isUsed ? (
                <span className="text-[10px] text-gray-400 mt-0.5">used up</span>
              ) : (
                <span className={`text-[10px] rounded-full px-1 mt-0.5 ${
                  isActive
                    ? 'bg-green-200 text-green-700'
                    : 'bg-indigo-100 text-indigo-600'
                }`}>
                  ×{count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
