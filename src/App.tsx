import { useEffect, useId, useReducer, useRef, useState, type ReactNode } from 'react';
import { Check, Settings2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

import { App as NativeApp } from '@capacitor/app';
import { ScreenAwake } from './native';
import { PlayerZone } from './PlayerZone';
import { STORAGE_KEY, SESSION_KEY, TABLE_KEY, isRotated, newSession, restoreSession, parseTable, reducer } from './model';

function read(key: string, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } }
function write(key: string, value: string, session = false) {
  try { (session ? sessionStorage : localStorage).setItem(key, value); return true; } catch { return false; }
}
function loadState() {
  const native = Capacitor.isNativePlatform();
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  // A new tab can inherit its opener's sessionStorage. Resume only this tab's
  // reloads/history visits, and overwrite inherited counts on a fresh navigation.
  const resume = navigation?.type === 'reload' || navigation?.type === 'back_forward';
  return restoreSession(read(STORAGE_KEY), resume ? read(SESSION_KEY, true) : null, native);
}
type Modal = 'setup' | null;
function Dialog({ title, children, close, className }: { title: string; children: ReactNode; close: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { const previous = document.activeElement as HTMLElement; const el = ref.current; el?.showModal(); return () => { el?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className={className} aria-labelledby={id} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="dialog-inner"><header className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}><X size={20}/></button></header>{children}</div></dialog>;
}
export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [table] = useState(() => parseTable(read(TABLE_KEY)));
  const [modal, setModal] = useState<Modal>(null); const [saveError, setSaveError] = useState<string | null>(null);
  const { board } = state;
  useEffect(() => {
    const preferencesSaved = write(STORAGE_KEY, JSON.stringify(newSession(state)));
    const tableSaved = write(TABLE_KEY, JSON.stringify(table));
    const energySaved = Capacitor.isNativePlatform() || write(SESSION_KEY, JSON.stringify(state), true);
    setSaveError(!energySaved ? 'Energy cannot be saved. Keep the app open to retain your energy.'
      : !preferencesSaved || !tableSaved ? 'Player settings cannot be saved for the next game.' : null);
  }, [state, table]);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) { void ScreenAwake.setEnabled({ enabled: true }).catch(() => {}); return; }
    let lock: WakeLockSentinel | null = null; let cancelled = false;
    const acquire = async () => { if (document.visibilityState === 'visible' && 'wakeLock' in navigator) { try { const result = await navigator.wakeLock.request('screen'); if (cancelled) await result.release(); else lock = result; } catch { /* Optional browser support. */ } } };
    void acquire(); document.addEventListener('visibilitychange', acquire);
    return () => { cancelled = true; void lock?.release(); document.removeEventListener('visibilitychange', acquire); };
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = NativeApp.addListener('backButton', () => { if (modal) setModal(null); else void NativeApp.exitApp(); });
    return () => { void listener.then(handle => handle.remove()); };
  }, [modal]);
  const act = dispatch;
  return <div className="tabletop">
    <main className={`table-surface players-${board.count}`} aria-label="Energy trackers">
      {board.players.slice(0, board.count).map((p, i) => <PlayerZone key={p.id} player={p} rotated={isRotated(i, board.count, table)} act={act}/>)}
      <button className="setup-button" aria-label="Open setup" onClick={() => setModal('setup')}><Settings2 size={21}/></button>
    </main>
    {saveError && <div className="save-warning" role="alert">{saveError}</div>}
    {modal === 'setup' && <Dialog title="Setup" className="setup-dialog" close={() => setModal(null)}>
      <div className="setup-body">
        <fieldset className="seat-options"><legend>Players</legend><div className="seat-choices">{[2, 4].map(n => <button key={n} aria-label={`${n} players`} aria-pressed={board.count === n} onClick={() => act({ type: 'count', count: n })}>
          <span className={`seat-preview seats-${n}`} aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i}/>)}</span><span>{n} players</span><Check className="seat-check" size={16} aria-hidden="true"/>
        </button>)}</div></fieldset>
        <fieldset className="energy-limits"><legend>Allow energy above 10</legend><p>Enable for decks that can hold extra energy.</p><div className="limit-players">{board.players.slice(0, board.count).map(p => <label className="setting" key={p.id}><span className="limit-player"><i style={{ background: p.color }}/><span>{p.name}{p.energy > 10 && <small>Lower energy to 10 before switching off.</small>}</span></span><input type="checkbox" role="switch" aria-label={`Allow energy above 10 for ${p.name}`} checked={p.allowAbove10} disabled={p.energy > 10} onChange={e => act({ type: 'limit', id: p.id, allowAbove10: e.target.checked })}/></label>)}</div></fieldset>
      </div>
      <footer className="setup-footer"><button className="primary full" onClick={() => setModal(null)}>Done</button></footer>
    </Dialog>}
  </div>;
}
