import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import createRelayRuntime from '@/components/arknet/relayRuntime';

export default function useArkNetwork(channel) {
  const { user } = useAuth();
  const runtime = useMemo(() => createRelayRuntime(`ark-network-v1-${user?.id || 'local'}`), [user?.id]);
  const [rows, setRows] = useState([]), [device, setDevice] = useState(null), [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ phase: 'unknown', lastContact: null, error: '', retryAt: null });
  const [hasMore, setHasMore] = useState(false);
  const lock = useRef(false), cursor = useRef(null), failures = useRef(0), retryAt = useRef(0), timer = useRef(null), syncRef = useRef(null), activeChannel = useRef(channel);
  activeChannel.current = channel;
  useEffect(() => {
    let active = true;
    setRows([]); setDevice(null); setLoading(true);
    const refresh = () => runtime.all().then(value => { if (active) setRows(value); }).catch(error => { if (active) setStatus(s => ({ ...s, error: error.message })); });
    const unsubscribe = runtime.subscribe(refresh);
    Promise.all([refresh(), runtime.identity().then(value => { if (active) setDevice(value); })]).catch(error => { if (active) setStatus(s => ({ ...s, error: error.message })); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [runtime]);
  const sync = useCallback(async (more = false) => {
    if (lock.current || Date.now() < retryAt.current || document.hidden) return;
    if (!navigator.onLine || !user) { setStatus(s => ({ ...s, phase: 'unavailable', error: !user ? 'Sign in for the online gateway. Local relaying still works.' : 'Browser reports no internet. Messages remain on this device.' })); return; }
    lock.current = true; clearTimeout(timer.current);
    setStatus(s => ({ ...s, phase: 'syncing', error: '' }));
    try {
      const packets = await runtime.pending();
      if (packets.length) {
        const { data } = await base44.functions.invoke('networkExchange', { action: 'push', packets });
        await runtime.markServer(data.accepted);
        setStatus(s => ({ ...s, lastContact: data.checked_at }));
      }
      const { data } = await base44.functions.invoke('networkExchange', { action: 'feed', channel, ...(more && cursor.current ? { cursor: cursor.current } : {}) });
      await runtime.receive(data.packets, 'server');
      if (activeChannel.current === channel) { cursor.current = data.next_cursor; setHasMore(Boolean(data.has_more)); }
      failures.current = 0; retryAt.current = 0;
      setStatus({ phase: 'available', lastContact: data.checked_at, error: '', retryAt: null });
      if ((await runtime.pending()).length) timer.current = setTimeout(() => syncRef.current?.(), 15000);
    } catch (error) {
      failures.current += 1;
      const retryHeader = Number(error.response?.headers?.['retry-after']);
      const delay = Math.max(60000, Number.isFinite(retryHeader) ? retryHeader * 1000 : 0, Math.min(300000, 30000 * 2 ** Math.min(failures.current - 1, 4)));
      retryAt.current = Date.now() + delay;
      setStatus(s => ({ ...s, phase: 'unavailable', error: error.response?.data?.error || error.message || 'Gateway unreachable. Local copies are retained.', retryAt: retryAt.current }));
      timer.current = setTimeout(() => syncRef.current?.(), delay);
    } finally { lock.current = false; if (activeChannel.current !== channel) { clearTimeout(timer.current); timer.current = setTimeout(() => syncRef.current?.(), 50); } }
  }, [runtime, channel, user]);
  syncRef.current = sync;
  useEffect(() => {
    cursor.current = null; setHasMore(false);
    sync();
    const online = () => syncRef.current?.();
    const offline = () => setStatus(s => ({ ...s, phase: 'unavailable', error: 'Browser reports no internet. Messages remain on this device.' }));
    const visible = () => { if (!document.hidden) syncRef.current?.(); };
    window.addEventListener('online', online); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', visible);
    return () => { clearTimeout(timer.current); window.removeEventListener('online', online); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', visible); };
  }, [sync]);
  const enqueue = async payload => { const envelope = await runtime.compose(payload); void sync(); return envelope; };
  const importBundle = async text => { const result = await runtime.importBundle(text); void sync(); return result; };
  return { runtime, rows, device, loading, status, hasMore, sync, enqueue, importBundle };
}