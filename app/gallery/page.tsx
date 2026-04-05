'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  loadGameState,
  GameState,
  CapturedCard,
  TARGET,
  toggleFavorite,
  releaseCard,
  restoreCard,
  emptyRecycleBin,
} from '@/lib/game-state';
import TypeBadge from '@/components/TypeBadge';

export default function GalleryPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<CapturedCard | null>(null);
  const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showBin, setShowBin] = useState(false);
  const [confirmEmptyBin, setConfirmEmptyBin] = useState(false);

  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  // Favorites float to top; rest stay chronological
  const sortedCards = useMemo(() => {
    if (!gameState) return [];
    return [
      ...gameState.capturedCards.filter((c) => c.isFavorite),
      ...gameState.capturedCards.filter((c) => !c.isFavorite),
    ];
  }, [gameState]);

  const handleToggleFavorite = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (!gameState) return;
    const newState = toggleFavorite(gameState, cardId);
    setGameState(newState);
    if (selected?.id === cardId) {
      setSelected(newState.capturedCards.find((c) => c.id === cardId) ?? null);
    }
  };

  const handleRequestRelease = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    setConfirmReleaseId(cardId);
  };

  const handleConfirmRelease = () => {
    if (!gameState || !confirmReleaseId) return;
    const idToDelete = confirmReleaseId;
    setConfirmReleaseId(null);
    if (selected?.id === idToDelete) setSelected(null);

    setDeletingId(idToDelete);
    setTimeout(() => {
      setGameState((prev) => (prev ? releaseCard(prev, idToDelete) : prev));
      setDeletingId(null);
    }, 400);
  };

  const handleRestore = (cardId: string) => {
    if (!gameState) return;
    setRestoringId(cardId);
    setTimeout(() => {
      setGameState((prev) => (prev ? restoreCard(prev, cardId) : prev));
      setRestoringId(null);
    }, 400);
  };

  const handleEmptyBin = () => {
    if (!gameState) return;
    setGameState(emptyRecycleBin(gameState));
    setConfirmEmptyBin(false);
  };

  if (!gameState) return null;

  const binCount = gameState.recycledCards.length;

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(160deg, #0a0e2a 0%, #12103a 55%, #1d1448 100%)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-3xl font-black"
              style={{ color: '#c8a8ff', textShadow: '0 0 20px rgba(157, 53, 255, 0.4)' }}
            >
              Oliver&apos;s Collection
            </h1>
            <p className="font-semibold" style={{ color: '#7a5aaa' }}>
              {gameState.totalGuessed} / {TARGET} cards captured
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Recycle bin toggle */}
            <button
              onClick={() => setShowBin((v) => !v)}
              className="relative font-bold py-2 px-4 rounded-full text-sm transition-all hover:scale-105"
              style={{
                background: showBin
                  ? 'rgba(255, 53, 110, 0.2)'
                  : 'rgba(255,255,255,0.06)',
                border: showBin
                  ? '1px solid rgba(255, 53, 110, 0.5)'
                  : '1px solid rgba(255,255,255,0.12)',
                color: showBin ? '#ff7a9a' : '#7a5aaa',
              }}
            >
              🗑️ Bin
              {binCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: '#ff356e', color: '#fff' }}
                >
                  {binCount}
                </span>
              )}
            </button>
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
          </div>
        </header>

        {/* ── Recycle Bin panel ── */}
        {showBin && (
          <div
            className="rounded-2xl p-4 mb-6"
            style={{
              background: 'rgba(255, 53, 110, 0.06)',
              border: '1px solid rgba(255, 53, 110, 0.25)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm" style={{ color: '#ff7a9a' }}>
                🗑️ Recycle Bin
                {binCount > 0 && (
                  <span className="ml-2 font-normal" style={{ color: '#7a5aaa' }}>
                    — {binCount} card{binCount !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              {binCount > 0 && (
                confirmEmptyBin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#ff7a9a' }}>Permanently delete all?</span>
                    <button
                      onClick={handleEmptyBin}
                      className="text-xs font-bold py-1 px-3 rounded-full transition-all hover:scale-105"
                      style={{ background: 'rgba(255,53,110,0.25)', border: '1px solid #ff356e', color: '#ff7a9a' }}
                    >
                      Yes, empty
                    </button>
                    <button
                      onClick={() => setConfirmEmptyBin(false)}
                      className="text-xs font-bold py-1 px-3 rounded-full transition-all hover:scale-105"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7a5aaa' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmEmptyBin(true)}
                    className="text-xs font-bold py-1 px-3 rounded-full transition-all hover:scale-105"
                    style={{ background: 'rgba(255,53,110,0.12)', border: '1px solid rgba(255,53,110,0.3)', color: '#ff7a9a' }}
                  >
                    Empty Bin
                  </button>
                )
              )}
            </div>

            {binCount === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#4a3a7a' }}>
                Bin is empty — released cards will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {gameState.recycledCards.map((card) => {
                  const isRestoring = restoringId === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleRestore(card.id)}
                      disabled={isRestoring}
                      className={`relative aspect-[2/3] rounded-xl overflow-hidden transition-all active:scale-95 ${
                        isRestoring ? 'card-restoring' : 'hover:scale-105'
                      }`}
                      style={{
                        border: '1px solid rgba(57, 235, 140, 0.3)',
                        background: '#111532',
                        opacity: isRestoring ? 1 : 0.7,
                        filter: 'grayscale(40%)',
                      }}
                      title={`Restore ${card.name}`}
                    >
                      <Image
                        src={card.imageLarge}
                        alt={card.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 33vw, 12vw"
                      />
                      {/* Always-visible restore label at bottom */}
                      <div
                        className="absolute bottom-0 inset-x-0 flex items-center justify-center py-1.5"
                        style={{ background: 'rgba(10,8,30,0.75)' }}
                      >
                        <span
                          className="text-[10px] font-black tracking-wide"
                          style={{ color: '#39eb8c' }}
                        >
                          ↩ RESTORE
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Main collection grid ── */}
        {sortedCards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎴</div>
            <p className="font-bold text-xl" style={{ color: '#c8a8ff' }}>
              No cards captured yet!
            </p>
            <p className="mt-1" style={{ color: '#7a5aaa' }}>
              Head back and start guessing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {sortedCards.map((card) => {
              const isDeleting = deletingId === card.id;
              const isFav = card.isFavorite;

              return (
                <div
                  key={card.id}
                  className={`relative group aspect-[2/3] rounded-xl overflow-hidden transition-all cursor-pointer ${
                    isDeleting ? 'card-deleting' : 'hover:scale-105'
                  }`}
                  style={{
                    border: isFav
                      ? '1px solid rgba(255, 80, 120, 0.6)'
                      : '1px solid rgba(157, 53, 255, 0.25)',
                    background: '#111532',
                    boxShadow: isFav
                      ? '0 0 12px 3px rgba(255, 80, 120, 0.35)'
                      : '0 2px 12px rgba(0,0,0,0.4)',
                  }}
                  onClick={() => setSelected(card)}
                >
                  <Image
                    src={card.imageLarge}
                    alt={card.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                  />

                  {isFav && (
                    <div
                      className="absolute inset-0 pointer-events-none rounded-xl favorited-glow"
                      style={{ border: '2px solid rgba(255, 80, 120, 0.5)' }}
                    />
                  )}

                  {/* Action buttons on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                    <button
                      onClick={(e) => handleToggleFavorite(e, card.id)}
                      className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center text-base transition-all hover:scale-125 active:scale-95"
                      style={{
                        background: isFav ? 'rgba(255, 80, 120, 0.85)' : 'rgba(20, 15, 40, 0.75)',
                        backdropFilter: 'blur(4px)',
                        border: isFav ? '1px solid rgba(255, 120, 150, 0.8)' : '1px solid rgba(255,255,255,0.15)',
                      }}
                      title={isFav ? 'Unfavorite' : 'Favorite'}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>

                    <button
                      onClick={(e) => handleRequestRelease(e, card.id)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all hover:scale-125 active:scale-95"
                      style={{
                        background: 'rgba(20, 15, 40, 0.75)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                      title="Move to recycle bin"
                    >
                      🗑️
                    </button>
                  </div>

                  {isFav && (
                    <div className="absolute top-1.5 left-1.5 text-sm leading-none pointer-events-none">
                      ❤️
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Release confirmation modal */}
      {confirmReleaseId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(5, 5, 20, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmReleaseId(null)}
        >
          <div
            className="rounded-3xl p-6 max-w-xs w-full text-center card-glow"
            style={{ background: '#111532', border: '1px solid rgba(255, 53, 110, 0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-black mb-2" style={{ color: '#c8a8ff' }}>
              Move to Recycle Bin?
            </h2>
            <p className="text-sm mb-5" style={{ color: '#7a5aaa' }}>
              You can restore this card from the bin at any time.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmRelease}
                className="font-bold py-2 px-5 rounded-full transition-all hover:scale-105"
                style={{ background: 'rgba(255, 53, 110, 0.2)', border: '1px solid #ff356e', color: '#ff7a9a' }}
              >
                Move to Bin
              </button>
              <button
                onClick={() => setConfirmReleaseId(null)}
                className="font-bold py-2 px-5 rounded-full transition-all hover:scale-105"
                style={{ background: 'rgba(157, 53, 255, 0.15)', border: '1px solid rgba(157, 53, 255, 0.4)', color: '#c8a8ff' }}
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}

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
              <Image src={selected.imageLarge} alt={selected.name} fill className="object-contain" sizes="288px" />
            </div>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-xl font-black" style={{ color: '#c8a8ff' }}>{selected.name}</h2>
              <button
                onClick={(e) => handleToggleFavorite(e, selected.id)}
                className="text-xl transition-all hover:scale-125 ml-2"
                title={selected.isFavorite ? 'Unfavorite' : 'Favorite'}
              >
                {selected.isFavorite ? '❤️' : '🤍'}
              </button>
            </div>
            <p className="text-sm mb-2" style={{ color: '#4a3a7a' }}>{selected.set}</p>
            {selected.types && (
              <div className="flex gap-2 flex-wrap mb-3">
                {selected.types.map((t) => <TypeBadge key={t} type={t} />)}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setSelected(null); setConfirmReleaseId(selected.id); }}
                className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255, 53, 110, 0.1)', border: '1px solid rgba(255, 53, 110, 0.3)', color: '#ff7a9a' }}
              >
                🗑️ Bin
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(157, 53, 255, 0.12)', border: '1px solid rgba(157, 53, 255, 0.3)', color: '#c8a8ff' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
