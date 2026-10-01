export const COLORS = ['#c9f76f', '#b6a0ff', '#ffac87', '#81dce5'];
export const MAX_ENERGY = 9999;
export const STORAGE_KEY = 'vanguard-energy-v1';
export const SESSION_KEY = 'vanguard-session-v1';
export type Player = { id: number; name: string; color: string; energy: number; allowAbove10: boolean };
export type Board = { players: Player[]; count: 2 | 4 };
export type State = { board: Board };
export const initialState = (): State => ({ board: {
  players: COLORS.map((color, id) => ({ id, name: `Player ${id + 1}`, color, energy: 0, allowAbove10: false })),
  count: 2
} });
export const energyLimit = (player: Player) => player.allowAbove10 ? MAX_ENERGY : 10;
export type Action =
  | { type: 'energy'; id: number; delta: number }
  | { type: 'reset-player'; id: number }
  | { type: 'limit'; id: number; allowAbove10: boolean }
  | { type: 'count'; count: number };

export function reducer(state: State, action: Action): State {
  const board = structuredClone(state.board);
  if (action.type === 'energy') {
    const p = board.players[action.id];
    if (!p || !Number.isSafeInteger(action.delta) || p.energy + action.delta < 0) return state;
    p.energy = Math.min(energyLimit(p), p.energy + action.delta);
  } else if (action.type === 'reset-player') {
    const p = board.players[action.id];
    if (!p) return state;
    p.energy = 0;
  } else if (action.type === 'limit') {
    const p = board.players[action.id];
    // Never silently discard energy when restoring the normal limit.
    if (!p || (!action.allowAbove10 && p.energy > 10)) return state;
    p.allowAbove10 = action.allowAbove10;
  } else if (action.type === 'count') {
    if (action.count !== 2 && action.count !== 4) return state;
    board.count = action.count;
  }
  if (JSON.stringify(board) === JSON.stringify(state.board)) return state;
  return { board };
}

function parseBoard(value: unknown): Board | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Board;
  if (!Number.isInteger(b.count) || b.count < 1 || b.count > 4 || !Array.isArray(b.players) || b.players.length !== 4) return null;
  const players: Player[] = [];
  for (let id = 0; id < 4; id++) {
    const p = b.players[id];
    if (!p || p.id !== id || typeof p.name !== 'string' || p.name.length > 24 || !COLORS.includes(p.color)) return null;
    const allowAbove10 = p.allowAbove10 === true;
    if (!Number.isSafeInteger(p.energy) || p.energy < 0 || p.energy > (allowAbove10 ? MAX_ENERGY : 10)) return null;
    // Explicitly project fields so old damage, soul, wins, and turn data cannot return.
    players.push({ id, name: p.name, color: p.color, energy: p.energy, allowAbove10 });
  }
  // Migrate old one-/three-player tables without losing counters.
  return { count: b.count <= 2 ? 2 : 4, players };
}

export function parseState(raw: string | null): State {
  try {
    const value = JSON.parse(raw || 'null'); const board = parseBoard(value?.board);
    if (!board) return initialState();
    // Project only the current board; retired undo history is never restored.
    return { board };
  } catch { return initialState(); }
}

// Keep player preferences across launches, but never carry a game's counts
// into a new session (including hidden players).
export function newSession(state: State): State {
  return { board: { ...state.board, players: state.board.players.map(p => ({ ...p, energy: 0 })) } };
}

export function restoreSession(saved: string | null, session: string | null, native: boolean): State {
  // Android keeps the current game in memory while backgrounded. A new
  // WebView starts fresh even if its old session storage was restored.
  return !native && session ? parseState(session) : newSession(parseState(saved));
}

export const TABLE_KEY = 'vanguard-tabletop-v2';
export type TableOptions = { facing: true; flips: boolean[] };
export function parseTable(raw: string | null): TableOptions {
  try {
    const t = JSON.parse(raw || 'null');
    return { facing: true,
      flips: Array.from({ length: 4 }, (_, i) => t?.flips?.[i] === true) };
  } catch { return { facing: true, flips: [false, false, false, false] }; }
}
export function isRotated(index: number, count: number, table: TableOptions) {
  return (table.facing && index < count / 2) !== table.flips[index];
}
