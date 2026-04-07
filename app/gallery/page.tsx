'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  loadGameState,
  saveGameState,
  GameState,
  CapturedCard,
  TARGET,
  toggleFavorite,
  releaseCard,
  restoreCard,
  emptyRecycleBin,
  setCardOrder,
  exportTrainerCode,
  importTrainerCode,
} from '@/lib/game-state';
import TypeBadge from '@/components/TypeBadge';

// ── Sortable card component ────────────────────────────────────────────────
interface SortableCardProps {
  card: CapturedCard;
  isDeleting: boolean;
  onSelect: (card: CapturedCard) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onRequestRelease: (e: React.MouseEvent, id: string) => void;
}

function SortableCard({ card, isDeleting, onSelect, onToggleFavorite, onRequestRelease }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const isFav = card.isFavorite;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`relative group aspect-[2/3] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none ${
        isDeleting ? 'card-deleting' : isDragging ? 'opacity-40 scale-105' : 'hover:scale-105 transition-transform'
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        border: isFav ? '1px solid rgba(255,80,120,0.6)' : '1px solid rgba(157,53,255,0.25)',
        background: '#111532',
        boxShadow: isFav ? '0 0 12px 3px rgba(255,80,120,0.35)' : '0 2px 12px rgba(0,0,0,0.4)',
      }}
      onClick={() => !isDragging && onSelect(card)}
    >
      <Image
        src={card.imageLarge}
        alt={card.name}
        fill
        className="object-cover pointer-events-none"
        sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
        draggable={false}
      />

      {isFav && (
        <div
          className="absolute inset-0 pointer-events-none rounded-xl favorited-glow"
          style={{ border: '2px solid rgba(255,80,120,0.5)' }}
        />
      )}

      {/* Action buttons — stop propagation so they don't start a drag */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => onToggleFavorite(e, card.id)}
          className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center text-base hover:scale-125 active:scale-95"
          style={{
            background: isFav ? 'rgba(255,80,120,0.85)' : 'rgba(20,15,40,0.75)',
            backdropFilter: 'blur(4px)',
            border: isFav ? '1px solid rgba(255,120,150,0.8)' : '1px solid rgba(255,255,255,0.15)',
          }}
          title={isFav ? 'Unfavorite' : 'Favorite'}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => onRequestRelease(e, card.id)}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm hover:scale-125 active:scale-95"
          style={{
            background: 'rgba(20,15,40,0.75)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
          title="Move to recycle bin"
        >
          🗑️
        </button>
      </div>

      {isFav && (
        <div className="absolute top-1.5 left-1.5 text-sm leading-none pointer-events-none">❤️</div>
      )}
    </div>
  );
}

// ── Main gallery page ──────────────────────────────────────────────────────
export default function GalleryPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<CapturedCard | null>(null);
  const [confirmReleaseId, setConfirmReleaseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showBin, setShowBin] = useState(false);
  const [confirmEmptyBin, setConfirmEmptyBin] = useState(false);
  // Export / Import
  const [showExport, setShowExport] = useState(false);
  const [exportCode, setExportCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  // Mouse: drag starts after moving 8px (natural desktop feel, no delay)
  // Touch: 250 ms long-press so normal scrolling/tapping still works
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !gameState) return;
    const cards = gameState.capturedCards;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(cards, oldIndex, newIndex);
    setGameState(setCardOrder(gameState, reordered.map((c) => c.id)));
  };

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
    const id = confirmReleaseId;
    setConfirmReleaseId(null);
    if (selected?.id === id) setSelected(null);
    setDeletingId(id);
    setTimeout(() => {
      setGameState((prev) => (prev ? releaseCard(prev, id) : prev));
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

  const handleExport = () => {
    if (!gameState) return;
    setExportCode(exportTrainerCode(gameState));
    setCopied(false);
    setShowExport(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImport = () => {
    if (!gameState || !importCode.trim()) return;
    try {
      const { newState, added } = importTrainerCode(gameState, importCode);
      setGameState(newState);
      setImportStatus({ ok: true, msg: `✓ Added ${added} new card${added !== 1 ? 's' : ''} to your collection!` });
      setImportCode('');
    } catch {
      setImportStatus({ ok: false, msg: '✗ Invalid Trainer Code. Please check and try again.' });
    }
  };

  if (!gameState) return null;

  const binCount = gameState.recycledCards.length;
  const cards = gameState.capturedCards;

  return (
    <main
      className="min-h-screen px-4 py-6"
      style={{ background: 'linear-gradient(160deg, #0a0e2a 0%, #12103a 55%, #1d1448 100%)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black" style={{ color: '#c8a8ff', textShadow: '0 0 20px rgba(157,53,255,0.4)' }}>
              Oliver&apos;s Collection
            </h1>
            <p className="font-semibold" style={{ color: '#7a5aaa' }}>
              {gameState.totalGuessed} / {TARGET} cards captured
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export */}
            <button
              onClick={handleExport}
              className="font-bold py-2 px-3 rounded-full text-xs transition-all hover:scale-105"
              style={{ background: 'rgba(157,53,255,0.15)', border: '1px solid rgba(157,53,255,0.4)', color: '#c8a8ff' }}
              title="Export Trainer Code"
            >
              📤 Export
            </button>
            {/* Import */}
            <button
              onClick={() => { setShowImport(true); setImportStatus(null); }}
              className="font-bold py-2 px-3 rounded-full text-xs transition-all hover:scale-105"
              style={{ background: 'rgba(57,235,140,0.1)', border: '1px solid rgba(57,235,140,0.35)', color: '#39eb8c' }}
              title="Import Trainer Code"
            >
              📥 Import
            </button>
            {/* Recycle bin */}
            <button
              onClick={() => setShowBin((v) => !v)}
              className="relative font-bold py-2 px-3 rounded-full text-xs transition-all hover:scale-105"
              style={{
                background: showBin ? 'rgba(255,53,110,0.2)' : 'rgba(255,255,255,0.06)',
                border: showBin ? '1px solid rgba(255,53,110,0.5)' : '1px solid rgba(255,255,255,0.12)',
                color: showBin ? '#ff7a9a' : '#7a5aaa',
              }}
            >
              🗑️ Bin
              {binCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#ff356e', color: '#fff' }}>
                  {binCount}
                </span>
              )}
            </button>
            <Link
              href="/"
              className="font-bold py-2 px-4 rounded-full text-sm transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg,#7b2fff,#c86fff)', color: '#fff', boxShadow: '0 0 14px rgba(157,53,255,0.4)' }}
            >
              ← Play
            </Link>
          </div>
        </header>

        {/* ── Recycle Bin panel ── */}
        {showBin && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,53,110,0.06)', border: '1px solid rgba(255,53,110,0.25)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm" style={{ color: '#ff7a9a' }}>
                🗑️ Recycle Bin
                {binCount > 0 && <span className="ml-2 font-normal" style={{ color: '#7a5aaa' }}>— {binCount} card{binCount !== 1 ? 's' : ''}</span>}
              </p>
              {binCount > 0 && (
                confirmEmptyBin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#ff7a9a' }}>Permanently delete all?</span>
                    <button onClick={handleEmptyBin} className="text-xs font-bold py-1 px-3 rounded-full hover:scale-105" style={{ background: 'rgba(255,53,110,0.25)', border: '1px solid #ff356e', color: '#ff7a9a' }}>Yes, empty</button>
                    <button onClick={() => setConfirmEmptyBin(false)} className="text-xs font-bold py-1 px-3 rounded-full hover:scale-105" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7a5aaa' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmEmptyBin(true)} className="text-xs font-bold py-1 px-3 rounded-full hover:scale-105" style={{ background: 'rgba(255,53,110,0.12)', border: '1px solid rgba(255,53,110,0.3)', color: '#ff7a9a' }}>Empty Bin</button>
                )
              )}
            </div>
            {binCount === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#4a3a7a' }}>Bin is empty — released cards appear here.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {gameState.recycledCards.map((card) => {
                  const isRestoring = restoringId === card.id;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleRestore(card.id)}
                      disabled={isRestoring}
                      className={`relative aspect-[2/3] rounded-xl overflow-hidden transition-all active:scale-95 ${isRestoring ? 'card-restoring' : 'hover:scale-105'}`}
                      style={{ border: '1px solid rgba(57,235,140,0.3)', background: '#111532', opacity: isRestoring ? 1 : 0.7, filter: 'grayscale(40%)' }}
                      title={`Restore ${card.name}`}
                    >
                      <Image src={card.imageLarge} alt={card.name} fill className="object-cover" sizes="(max-width: 640px) 33vw, 12vw" />
                      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center py-1.5" style={{ background: 'rgba(10,8,30,0.75)' }}>
                        <span className="text-[10px] font-black tracking-wide" style={{ color: '#39eb8c' }}>↩ RESTORE</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Main collection grid ── */}
        {cards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎴</div>
            <p className="font-bold text-xl" style={{ color: '#c8a8ff' }}>No cards captured yet!</p>
            <p className="mt-1" style={{ color: '#7a5aaa' }}>Head back and start guessing.</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-3 font-semibold" style={{ color: '#3a2a5a' }}>
              Hold & drag to reorder
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cards.map((c) => c.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {cards.map((card) => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      isDeleting={deletingId === card.id}
                      onSelect={setSelected}
                      onToggleFavorite={handleToggleFavorite}
                      onRequestRelease={handleRequestRelease}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* ── Export modal ── */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,20,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setShowExport(false)}>
          <div className="rounded-3xl p-6 w-full max-w-sm card-glow" style={{ background: '#111532', border: '1px solid rgba(157,53,255,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-1" style={{ color: '#c8a8ff' }}>📤 Trainer Code</h2>
            <p className="text-xs mb-3" style={{ color: '#7a5aaa' }}>Share this code to merge your collection on another device.</p>
            <textarea
              readOnly
              value={exportCode}
              rows={4}
              className="w-full rounded-xl text-xs p-3 mb-3 resize-none font-mono outline-none"
              style={{ background: '#0a0e2a', border: '1px solid rgba(157,53,255,0.2)', color: '#9d70cc' }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02]"
                style={{
                  background: copied ? 'rgba(57,235,140,0.2)' : 'rgba(157,53,255,0.2)',
                  border: copied ? '1px solid #39eb8c' : '1px solid rgba(157,53,255,0.4)',
                  color: copied ? '#39eb8c' : '#c8a8ff',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
              <button onClick={() => setShowExport(false)} className="font-bold py-2 px-4 rounded-xl hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7a5aaa' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,20,0.85)', backdropFilter: 'blur(4px)' }} onClick={() => setShowImport(false)}>
          <div className="rounded-3xl p-6 w-full max-w-sm card-glow" style={{ background: '#111532', border: '1px solid rgba(57,235,140,0.35)' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-1" style={{ color: '#c8a8ff' }}>📥 Import Trainer Code</h2>
            <p className="text-xs mb-3" style={{ color: '#7a5aaa' }}>Paste a code to merge cards into your collection. Duplicates are skipped.</p>
            <textarea
              value={importCode}
              onChange={(e) => { setImportCode(e.target.value); setImportStatus(null); }}
              rows={4}
              placeholder="Paste Trainer Code here…"
              className="w-full rounded-xl text-xs p-3 mb-2 resize-none font-mono outline-none"
              style={{ background: '#0a0e2a', border: '1px solid rgba(57,235,140,0.25)', color: '#9d70cc' }}
            />
            {importStatus && (
              <p className="text-xs mb-2 font-bold" style={{ color: importStatus.ok ? '#39eb8c' : '#ff7a9a' }}>
                {importStatus.msg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={!importCode.trim()}
                className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02] disabled:opacity-40"
                style={{ background: 'rgba(57,235,140,0.15)', border: '1px solid #39eb8c', color: '#39eb8c' }}
              >
                Import
              </button>
              <button onClick={() => { setShowImport(false); setImportCode(''); setImportStatus(null); }} className="font-bold py-2 px-4 rounded-xl hover:scale-[1.02]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#7a5aaa' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Release confirmation ── */}
      {confirmReleaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,20,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmReleaseId(null)}>
          <div className="rounded-3xl p-6 max-w-xs w-full text-center card-glow" style={{ background: '#111532', border: '1px solid rgba(255,53,110,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-black mb-2" style={{ color: '#c8a8ff' }}>Move to Recycle Bin?</h2>
            <p className="text-sm mb-5" style={{ color: '#7a5aaa' }}>You can restore this card from the bin at any time.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleConfirmRelease} className="font-bold py-2 px-5 rounded-full transition-all hover:scale-105" style={{ background: 'rgba(255,53,110,0.2)', border: '1px solid #ff356e', color: '#ff7a9a' }}>Move to Bin</button>
              <button onClick={() => setConfirmReleaseId(null)} className="font-bold py-2 px-5 rounded-full transition-all hover:scale-105" style={{ background: 'rgba(157,53,255,0.15)', border: '1px solid rgba(157,53,255,0.4)', color: '#c8a8ff' }}>Keep</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Card detail modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5,5,20,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div className="rounded-3xl p-5 max-w-xs w-full card-glow" style={{ background: '#111532', border: '1px solid rgba(157,53,255,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full aspect-[2/3] mb-4 rounded-2xl overflow-hidden">
              <Image src={selected.imageLarge} alt={selected.name} fill className="object-contain" sizes="288px" />
            </div>
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-xl font-black" style={{ color: '#c8a8ff' }}>{selected.name}</h2>
              <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => handleToggleFavorite(e, selected.id)} className="text-xl hover:scale-125 ml-2" title={selected.isFavorite ? 'Unfavorite' : 'Favorite'}>
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
              <button onClick={() => { setSelected(null); setConfirmReleaseId(selected.id); }} className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'rgba(255,53,110,0.1)', border: '1px solid rgba(255,53,110,0.3)', color: '#ff7a9a' }}>🗑️ Bin</button>
              <button onClick={() => setSelected(null)} className="flex-1 font-bold py-2 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'rgba(157,53,255,0.12)', border: '1px solid rgba(157,53,255,0.3)', color: '#c8a8ff' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
