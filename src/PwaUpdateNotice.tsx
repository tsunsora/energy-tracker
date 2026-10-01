import { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(false);
  if (!needRefresh) return null;
  const update = async () => {
    setUpdating(true); setError(false);
    try { await updateServiceWorker(); } catch { setError(true); setUpdating(false); }
  };
  return <aside className="update-notice" role="status" aria-label="App update">
    <span>{error ? 'Update failed. Please try again.' : 'A new version is ready.'}</span>
    <button className="primary" disabled={updating} onClick={() => void update()}>{updating ? 'Updating…' : 'Update'}</button>
    <button disabled={updating} onClick={() => setNeedRefresh(false)}>Later</button>
  </aside>;
}
