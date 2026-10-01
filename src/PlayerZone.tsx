import { useEffect, useRef, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { energyLimit, type Action, type Player } from './model';

export function PlayerZone({ player, rotated, act }: {
  player: Player; rotated: boolean; act: (action: Action) => void;
}) {
  const pointer = useRef<{ id: number; x: number; y: number; delta: 1 | -1; cancelled: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  const cancelGesture = () => { cancelHold(); pointer.current = null; };
  useEffect(() => {
    window.addEventListener('blur', cancelGesture);
    document.addEventListener('visibilitychange', cancelGesture);
    return () => {
      cancelGesture();
      window.removeEventListener('blur', cancelGesture);
      document.removeEventListener('visibilitychange', cancelGesture);
    };
  }, []);
  const start = (event: PointerEvent<HTMLButtonElement>, delta: 1 | -1) => {
    if (event.button !== 0 || pointer.current) return;
    const gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, delta, cancelled: false };
    pointer.current = gesture;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (delta !== -1) return;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      gesture.cancelled = true;
      act({ type: 'reset-player', id: player.id });
    }, 600);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const p = pointer.current;
    if (p?.id !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 14 || event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
      p.cancelled = true; cancelHold();
    }
  };
  const finish = (event: PointerEvent<HTMLButtonElement>) => {
    const p = pointer.current;
    if (p?.id !== event.pointerId) return;
    cancelGesture();
    if (!p.cancelled) act({ type: 'energy', id: player.id, delta: p.delta });
  };
  const cancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id === event.pointerId) cancelGesture();
  };
  const click = (event: MouseEvent<HTMLButtonElement>, delta: 1 | -1) => {
    // Pointer gestures commit on release, including secondary fingers. Keep
    // click activation for keyboards and assistive technology without counting twice.
    if (event.detail === 0) act({ type: 'energy', id: player.id, delta });
  };
  return <article className="player-zone" style={{ '--player': player.color } as CSSProperties} aria-label={`${player.name} tracker`}>
    <div className={`zone-facing ${rotated ? 'rotated' : ''}`}>
      <span className="player-name">{player.name}</span>
      <div className={`energy-control digits-${String(player.energy).length}`}>
        <button className="tap-half plus-half" aria-label={`Add 1 energy to ${player.name}`} disabled={player.energy === energyLimit(player)} onPointerDown={e => start(e, 1)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onClick={e => click(e, 1)}><span className="adjust-indicator" aria-hidden="true"><ChevronUp/><span>ADD</span></span></button>
        <div className="counter-readout" aria-live="polite" aria-atomic="true"><span className="counter-value">{player.energy}</span></div>
        <button className="tap-half minus-half" aria-label={`Remove 1 energy from ${player.name}`} aria-description="Hold to reset energy to zero" disabled={player.energy === 0} onPointerDown={e => start(e, -1)} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onContextMenu={e => e.preventDefault()} onClick={e => click(e, -1)}><span className="adjust-indicator" aria-hidden="true"><ChevronDown/><span>REMOVE</span></span></button>
      </div>
      <button className="charge-button" aria-label={`Charge +3 for ${player.name}`} disabled={player.energy === energyLimit(player)} onClick={() => act({ type: 'energy', id: player.id, delta: 3 })}>+3</button>
    </div>
  </article>;
}
