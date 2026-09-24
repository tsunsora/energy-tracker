import { describe, expect, it } from 'vitest';
import { COLORS, MAX_ENERGY, initialState, isRotated, parseState, parseTable, reducer } from './model';

describe('energy only', () => {
  it('caps normal charging at 10 and never permits negative energy', () => {
    let s = initialState();
    expect(reducer(s, { type: 'energy', id: 0, delta: -1 })).toBe(s);
    s = reducer(s, { type: 'energy', id: 0, delta: 9 });
    s = reducer(s, { type: 'energy', id: 0, delta: 3 });
    expect(s.board.players[0].energy).toBe(10);
    expect(reducer(s, { type: 'energy', id: 0, delta: 1 })).toBe(s);
  });
  it('allows energy above 10 independently, including +3 and exact subtraction', () => {
    let s = reducer(initialState(), { type: 'limit', id: 0, allowAbove10: true });
    s = reducer(s, { type: 'energy', id: 0, delta: 10 });
    s = reducer(s, { type: 'energy', id: 0, delta: 3 });
    s = reducer(s, { type: 'energy', id: 1, delta: 13 });
    expect(s.board.players.map(p => p.energy)).toEqual([13, 10, 0, 0]);
    expect(reducer(s, { type: 'limit', id: 0, allowAbove10: false })).toBe(s);
    s = reducer(s, { type: 'energy', id: 0, delta: -3 });
    s = reducer(s, { type: 'limit', id: 0, allowAbove10: false });
    expect(s.board.players[0].allowAbove10).toBe(false);
    expect(s.board.players[0].energy).toBe(10);
  });
  it('persists extended energy and restores it with undo', () => {
    let s = reducer(initialState(), { type: 'limit', id: 0, allowAbove10: true });
    s = reducer(s, { type: 'energy', id: 0, delta: 125 });
    s = parseState(JSON.stringify(s));
    expect(s.board.players[0].energy).toBe(125);
    const reset = reducer(s, { type: 'reset' });
    expect(reset.board.players[0].allowAbove10).toBe(true);
    expect(reducer(reset, { type: 'undo' }).board).toEqual(s.board);
  });
  it('retains hidden players when changing table size', () => {
    let s = reducer(initialState(), { type: 'limit', id: 3, allowAbove10: true });
    s = reducer(s, { type: 'energy', id: 3, delta: 15 });
    s = reducer(s, { type: 'count', count: 2 });
    s = reducer(s, { type: 'count', count: 4 });
    expect(s.board.players[3].energy).toBe(15);
  });
  it('migrates earlier saves while removing unrelated counters and histories', () => {
    const players = COLORS.map((color, id) => ({ id, name: `P${id}`, color, energy: id + 3, nation: 'Old nation', damage: 4, soul: 5, wins: 2 }));
    const old = { board: { players, count: 4, active: 2, turn: 6 }, past: [{ before: {} }] };
    const s = parseState(JSON.stringify(old));
    expect(s.board.players.map(p => p.energy)).toEqual([3, 4, 5, 6]);
    expect(Object.keys(s.board.players[0]).sort()).toEqual(['allowAbove10', 'color', 'energy', 'id', 'name']);
    expect(s.past).toEqual([]);
  });
  it('migrates retired table sizes in current and undo state without losing energy', () => {
    const old = initialState();
    old.board.players[0].energy = 7;
    const one = { ...old.board, count: 1 };
    const three = { ...old.board, count: 3 };
    const migrated = parseState(JSON.stringify({ board: three, past: [one] }));
    expect(migrated.board.count).toBe(4);
    expect(migrated.board.players[0].energy).toBe(7);
    const undone = reducer(migrated, { type: 'undo' });
    expect(undone.board.count).toBe(2);
    expect(undone.board.players[0].energy).toBe(7);
    expect(reducer(undone, { type: 'count', count: 1 })).toBe(undone);
    expect(reducer(undone, { type: 'count', count: 3 })).toBe(undone);
  });
  it('rejects invalid storage and unsafe values, and bounds undo history', () => {
    expect(parseState('bad')).toEqual(initialState());
    let s = reducer(initialState(), { type: 'limit', id: 0, allowAbove10: true });
    s = reducer(s, { type: 'energy', id: 0, delta: MAX_ENERGY + 1 });
    expect(s.board.players[0].energy).toBe(MAX_ENERGY);
    expect(reducer(s, { type: 'energy', id: 0, delta: Infinity })).toBe(s);
    for (let i = 0; i < 60; i++) s = reducer(s, { type: 'energy', id: 0, delta: -1 });
    expect(s.past).toHaveLength(50);
  });
  it('preserves names, colors, and limits on reset', () => {
    let s = reducer(initialState(), { type: 'profile', id: 1, name: 'Ren', color: COLORS[2] });
    s = reducer(s, { type: 'limit', id: 1, allowAbove10: true });
    s = reducer(s, { type: 'energy', id: 1, delta: 20 });
    s = reducer(s, { type: 'reset' });
    expect(s.board.players[1]).toEqual({ id: 1, name: 'Ren', color: COLORS[2], energy: 0, allowAbove10: true });
  });
});
describe('seating', () => {
  it('migrates seating and rotates opponents with individual overrides', () => {
    const t = parseTable('{"seating":"across","flips":[true]}');
    expect([0, 1, 2, 3].map(i => isRotated(i, 4, t))).toEqual([false, true, false, false]);
    expect(parseTable('bad').facing).toBe(true);
    expect(parseTable('{"seating":"upright"}').facing).toBe(true);
    expect(parseTable('{"facing":false}').facing).toBe(true);
  });
});
