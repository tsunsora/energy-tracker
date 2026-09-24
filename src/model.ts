export const COLORS = ['#c9f76f', '#b6a0ff', '#ffac87', '#81dce5'];
export const MAX_ENERGY = 9999;
export const STORAGE_KEY = 'vanguard-energy-v1';
export type Player = { id: number; name: string; color: string; energy: number; allowAbove10: boolean };
export type Board = { players: Player[]; count: 2 | 4 };
export type State = { board: Board; past: Board[] };
export const initialState = (): State => ({ board: {
  players: COLORS.map((color, id) => ({ id, name: `Player ${id + 1}`, color, energy: 0, allowAbove10: false })),
  count: 2
}, past: [] });
export const energyLimit = (player: Player) => player.allowAbove10 ? MAX_ENERGY : 10;
export type Action =
  | { type: 'energy'; id: number; delta: number }
  | { type: 'reset-player'; id: number }
  | { type: 'limit'; id: number; allowAbove10: boolean }
  | { type: 'profile'; id: number; name: string; color: string }
  | { type: 'count'; count: number }
  | { type: 'reset' } | { type: 'undo' };

export function reducer(state: State, action: Action): State {
  if (action.type === 'undo') {
    const board = state.past.at(-1);
    return board ? { board, past: state.past.slice(0, -1) } : state;
  }
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
  } else if (action.type === 'profile') {
    const p = board.players[action.id];
    if (!p) return state;
    p.name = action.name.trim().slice(0, 24) || `Player ${action.id + 1}`;
    p.color = COLORS.includes(action.color) ? action.color : COLORS[action.id];
  } else if (action.type === 'count') {
    if (action.count !== 2 && action.count !== 4) return state;
    board.count = action.count;
  } else if (action.type === 'reset') {
    board.players.forEach(p => { p.energy = 0; });
  }
  if (JSON.stringify(board) === JSON.stringify(state.board)) return state;
  return { board, past: [...state.past, state.board].slice(-50) };
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
  // Migrate old one-/three-player tables and undo snapshots without losing counters.
  return { count: b.count <= 2 ? 2 : 4, players };
}

export function parseState(raw: string | null): State {
  try {
    const value = JSON.parse(raw || 'null'); const board = parseBoard(value?.board);
    if (!board) return initialState();
    // Previous versions stored labeled history entries. Preserve the current counters,
    // but only restore undo snapshots from this energy-only version.
    const past = Array.isArray(value.past) ? value.past.slice(-50).map(parseBoard).filter((b: Board | null): b is Board => b !== null) : [];
    return { board, past };
  } catch { return initialState(); }
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
