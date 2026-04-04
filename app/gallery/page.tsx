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
    <main
      className="min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(160deg, #0a0e2a 0%, #12103a 55%, #1d1448 100%)' }}
    >
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-3xl font-black"
              style={{ color: '#c8a8ff', textShadow: '0 0 20px rgba(157, 53, 255, 0.4)' }}
            >
              Oliver&apos;s Collection
            </h1>
            <p className="font-semibold" style={{ color: '#7a5aaa' }}>
              {total} / {TARGET} cards captured
            </p>
          </div>
          <Link
            href="/"
            className="font-bold py-2 px-5 rounded-full transition-all text-sm hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #7b2fff, #c86fff)',
              color: '#fff',
              boxShadow: '0 0 14px rgba(157, 53, 255, 0.4)',
            }}
          >
            ← Play
          </Link>
        </header>

        {cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎴</div>
            <p className="font-bold text-xl" style={{ color: '#c8a8ff' }}>No cards captured yet!</p>
            <p className="mt-1" style={{ color: '#7a5aaa' }}>Head back and start guessing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelected(card)}
                className="relative aspect-[2/3] rounded-xl overflow-hidden transition-all hover:scale-105"
                style={{
                  border: '1px solid rgba(157, 53, 255, 0.25)',
                  background: '#111532',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(157, 53, 255, 0.7)';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(157, 53, 255, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(157, 53, 255, 0.25)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
                }}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 5, 20, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="rounded-3xl p-5 max-w-xs w-full card-glow"
            style={{ background: '#111532', border: '1px solid rgba(157, 53, 255, 0.4)' }}
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
            <h2 className="text-xl font-black mb-1" style={{ color: '#c8a8ff' }}>{selected.name}</h2>
            <p className="text-sm mb-2" style={{ color: '#4a3a7a' }}>{selected.set}</p>
            {selected.types && (
              <div className="flex gap-2 flex-wrap mb-3">
                {selected.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}
            <button
              onClick={() => setSelected(null)}
              className="w-full font-bold py-2 rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: 'rgba(157, 53, 255, 0.12)',
                border: '1px solid rgba(157, 53, 255, 0.3)',
                color: '#c8a8ff',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
