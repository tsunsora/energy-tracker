import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { energyLimit, type Action, type Player } from './model';

export function PlayerZone({ player, rotated, act, edit }: {
  player: Player; rotated: boolean; act: (action: Action) => void; edit: () => void;
}) {
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHold = () => {
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  useEffect(() => {
    window.addEventListener('blur', cancelHold);
    document.addEventListener('visibilitychange', cancelHold);
    return () => {
      cancelHold();
      window.removeEventListener('blur', cancelHold);
      document.removeEventListener('visibilitychange', cancelHold);
    };
  }, []);
  const start = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; moved.current = false;
  };
  const startHold = (event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    cancelHold();
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      moved.current = true; // Suppress the release click after resetting.
      act({ type: 'reset-player', id: player.id });
    }, 600);
  };
  const move = (event: PointerEvent) => {
    const p = pointer.current;
    if (p?.id === event.pointerId && Math.hypot(event.clientX - p.x, event.clientY - p.y) > 14) { moved.current = true; cancelHold(); }
  };
  return <article className="player-zone" style={{ '--player': player.color } as CSSProperties} aria-label={`${player.name} tracker`}>
    <button className={`player-name ${rotated ? 'rotated' : ''}`} aria-label={`Edit ${player.name}`} onClick={edit}>{player.name}</button>
    <div className={`zone-facing ${rotated ? 'rotated' : ''}`}>
      <div className={`energy-control digits-${String(player.energy).length}`} onPointerDown={start} onPointerMove={move} onPointerUp={cancelHold} onPointerCancel={() => { moved.current = true; cancelHold(); }} onClickCapture={e => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } }}>
        <button className="tap-half plus-half" aria-label={`Add 1 energy to ${player.name}`} disabled={player.energy === energyLimit(player)} onClick={() => act({ type: 'energy', id: player.id, delta: 1 })}><Plus/></button>
        <div className="counter-readout" aria-live="polite" aria-atomic="true"><span className="counter-value">{player.energy}</span></div>
        <button className="tap-half minus-half" aria-label={`Remove 1 energy from ${player.name}`} aria-description="Hold to reset energy to zero" disabled={player.energy === 0} onPointerDown={startHold} onPointerLeave={cancelHold} onContextMenu={e => e.preventDefault()} onClick={() => act({ type: 'energy', id: player.id, delta: -1 })}><Minus/></button>
      </div>
      <button className="charge-button" aria-label={`Charge +3 for ${player.name}`} disabled={player.energy === energyLimit(player)} onClick={() => act({ type: 'energy', id: player.id, delta: 3 })}>+3</button>
    </div>
  </article>;
}
