'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { loadGameState, CapturedCard, TARGET } from '@/lib/game-state';
import TypeBadge from '@/components/TypeBadge';

export default function GalleryPage() {
  const [cards, setCards] = useState<CapturedCard[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<CapturedCard | null>(null);

  useEffect(() => {
    const state = loadGameState();
    setCards(state.capturedCards);
    setTotal(state.totalGuessed);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-indigo-900">Oliver&apos;s Collection</h1>
            <p className="text-indigo-600 font-semibold">
              {total} / {TARGET} cards captured
            </p>
          </div>
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-full transition-colors text-sm"
          >
            ← Play
          </Link>
        </header>

        {cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎴</div>
            <p className="text-indigo-700 font-bold text-xl">No cards captured yet!</p>
            <p className="text-indigo-500 mt-1">Head back and start guessing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelected(card)}
                className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:scale-105 transition-all border-2 border-indigo-200 hover:border-indigo-500 bg-white"
              >
                <Image
                  src={card.imageLarge}
                  alt={card.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-[2/3] mb-4 rounded-2xl overflow-hidden">
              <Image
                src={selected.imageLarge}
                alt={selected.name}
                fill
                className="object-contain"
                sizes="288px"
              />
            </div>
            <h2 className="text-xl font-black text-indigo-900 mb-1">{selected.name}</h2>
            <p className="text-sm text-gray-500 mb-2">{selected.set}</p>
            {selected.types && (
              <div className="flex gap-2 flex-wrap mb-3">
                {selected.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}
            <button
              onClick={() => setSelected(null)}
              className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
