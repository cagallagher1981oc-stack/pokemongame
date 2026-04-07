// Game state management with localStorage persistence

export interface Lifelines {
  fiftyFifty: number;
  hint: number;
  typeReveal: number;
  artistInsight: number;
  evolutionChain: number;
  secondChance: number;
  skip: number;
}

export interface CapturedCard {
  id: string;
  name: string;
  imageSmall: string;
  imageLarge: string;
  types?: string[];
  set: string;
  isFavorite?: boolean;
}

export interface GameState {
  totalGuessed: number;
  score: number;
  currentStreak: number;
  incorrectGuesses: number;
  capturedCardIds: string[];
  capturedCards: CapturedCard[];
  recycledCards: CapturedCard[];
  lifelines: Lifelines;
}

const STORAGE_KEY = 'poke-guess-decade-defender';
const TARGET = 100;

export const MILESTONES: Record<number, { title: string; subtitle: string; refillLifelines?: boolean }> = {
  10: { title: 'Scout Rank!', subtitle: 'Oliver is now a Scout!' },
  20: { title: 'Trainer Rank!', subtitle: 'Oliver has become a real Trainer!' },
  50: { title: 'Ace Trainer!', subtitle: 'Halfway there — Ace Trainer status achieved!', refillLifelines: true },
  75: { title: 'Elite Rank Reached!', subtitle: 'Oliver is in the Elite Four territory!' },
  100: { title: 'GRAND CHAMPION!', subtitle: "Oliver is the Decade Defender — Pokémon TCG Grand Champion!" },
};

export const DEFAULT_LIFELINES: Lifelines = {
  fiftyFifty: 5,
  hint: 5,
  typeReveal: 5,
  artistInsight: 5,
  evolutionChain: 5,
  secondChance: 5,
  skip: 5,
};

export function loadGameState(): GameState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const state = JSON.parse(raw) as GameState;
    if (state.incorrectGuesses === undefined) state.incorrectGuesses = 0;
    if (state.recycledCards === undefined) state.recycledCards = [];
    if (state.lifelines.skip === undefined) state.lifelines.skip = 5;
    return state;
  } catch {
    return defaultState();
  }
}

function defaultState(): GameState {
  return {
    totalGuessed: 0,
    score: 0,
    currentStreak: 0,
    incorrectGuesses: 0,
    capturedCardIds: [],
    capturedCards: [],
    recycledCards: [],
    lifelines: { ...DEFAULT_LIFELINES },
  };
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetGameState(): GameState {
  const state = defaultState();
  saveGameState(state);
  return state;
}

export function softResetGameState(current: GameState): GameState {
  const state: GameState = {
    ...defaultState(),
    capturedCardIds: current.capturedCardIds,
    capturedCards: current.capturedCards,
    recycledCards: current.recycledCards,
  };
  saveGameState(state);
  return state;
}

export function addCapturedCard(state: GameState, card: CapturedCard): GameState {
  if (state.capturedCardIds.includes(card.id)) return state;
  const newState: GameState = {
    ...state,
    totalGuessed: state.totalGuessed + 1,
    score: state.score + 1,
    currentStreak: state.currentStreak + 1,
    capturedCardIds: [...state.capturedCardIds, card.id],
    capturedCards: [...state.capturedCards, card],
    recycledCards: state.recycledCards.filter((c) => c.id !== card.id),
  };
  if (newState.totalGuessed === 50) {
    newState.lifelines = { ...DEFAULT_LIFELINES };
  }
  saveGameState(newState);
  return newState;
}

export function recordMiss(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    currentStreak: 0,
    incorrectGuesses: state.incorrectGuesses + 1,
  };
  saveGameState(newState);
  return newState;
}

/** Skip: resets streak but does NOT increment incorrectGuesses. */
export function skipCard(state: GameState): GameState {
  const newState: GameState = { ...state, currentStreak: 0 };
  saveGameState(newState);
  return newState;
}

export function useLifeline(state: GameState, lifeline: keyof Lifelines): GameState {
  if (state.lifelines[lifeline] <= 0) return state;
  const newState: GameState = {
    ...state,
    lifelines: { ...state.lifelines, [lifeline]: state.lifelines[lifeline] - 1 },
  };
  saveGameState(newState);
  return newState;
}

export function toggleFavorite(state: GameState, cardId: string): GameState {
  const newState: GameState = {
    ...state,
    capturedCards: state.capturedCards.map((c) =>
      c.id === cardId ? { ...c, isFavorite: !c.isFavorite } : c
    ),
  };
  saveGameState(newState);
  return newState;
}

export function releaseCard(state: GameState, cardId: string): GameState {
  const card = state.capturedCards.find((c) => c.id === cardId);
  const newState: GameState = {
    ...state,
    capturedCardIds: state.capturedCardIds.filter((id) => id !== cardId),
    capturedCards: state.capturedCards.filter((c) => c.id !== cardId),
    recycledCards: card
      ? [...state.recycledCards, { ...card, isFavorite: false }]
      : state.recycledCards,
  };
  saveGameState(newState);
  return newState;
}

export function restoreCard(state: GameState, cardId: string): GameState {
  const card = state.recycledCards.find((c) => c.id === cardId);
  if (!card) return state;
  const newState: GameState = {
    ...state,
    capturedCardIds: [...state.capturedCardIds, card.id],
    capturedCards: [...state.capturedCards, card],
    recycledCards: state.recycledCards.filter((c) => c.id !== cardId),
  };
  saveGameState(newState);
  return newState;
}

export function emptyRecycleBin(state: GameState): GameState {
  const newState: GameState = { ...state, recycledCards: [] };
  saveGameState(newState);
  return newState;
}

/** Persist a new card display order after drag-and-drop reordering. */
export function setCardOrder(state: GameState, orderedIds: string[]): GameState {
  const cardMap = new Map(state.capturedCards.map((c) => [c.id, c]));
  const reordered = orderedIds.map((id) => cardMap.get(id)).filter(Boolean) as CapturedCard[];
  const newState: GameState = { ...state, capturedCards: reordered };
  saveGameState(newState);
  return newState;
}

/** Encode collection to a shareable Base64 Trainer Code. */
export function exportTrainerCode(state: GameState): string {
  return btoa(encodeURIComponent(JSON.stringify(state.capturedCards)));
}

/** Decode a Trainer Code and merge cards into the current state (no duplicates). */
export function importTrainerCode(state: GameState, code: string): { newState: GameState; added: number } {
  const decoded: CapturedCard[] = JSON.parse(decodeURIComponent(atob(code.trim())));
  if (!Array.isArray(decoded)) throw new Error('Invalid format');

  const existingIds = new Set(state.capturedCardIds);
  const newCards = decoded.filter(
    (c) => c && typeof c.id === 'string' && typeof c.name === 'string' && !existingIds.has(c.id)
  );

  const newState: GameState = {
    ...state,
    capturedCardIds: [...state.capturedCardIds, ...newCards.map((c) => c.id)],
    capturedCards: [...state.capturedCards, ...newCards],
  };
  saveGameState(newState);
  return { newState, added: newCards.length };
}

export { TARGET };
