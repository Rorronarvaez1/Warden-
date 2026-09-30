import { setTimeout as sleep } from 'node:timers/promises';
import { QUEUES, type ScanRequestMessage } from '@warden/shared';
import { config } from './config';
import { runScan } from './jobs/run-scan';
import { db } from './supabase';

const IDLE_DELAY_MS = 5_000;
const shutdown = new AbortController();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`[worker] ${sig} recibido, terminando después del trabajo actual`);
    shutdown.abort();
  });
}

interface QueueMessage<T> {
  msg_id: number;
  read_ct: number;
  message: T;
}

async function pollScanRequests(): Promise<boolean> {
  const { data, error } = await db.rpc('queue_read', {
    p_queue: QUEUES.scanRequests,
    p_visibility_timeout: config.QUEUE_VISIBILITY_TIMEOUT,
    p_quantity: 1,
  });
  if (error) throw error;

  const messages = (data ?? []) as QueueMessage<ScanRequestMessage>[];
  for (const msg of messages) {
    // Si el worker muere a mitad del escaneo, el mensaje reaparece al vencer el timeout.
    await runScan(db, msg.message.scan_id, { attempt: msg.read_ct, signal: shutdown.signal });
    await db.rpc('queue_delete', { p_queue: QUEUES.scanRequests, p_msg_id: msg.msg_id });
  }
  return messages.length > 0;
}

console.log('[worker] escuchando la cola', QUEUES.scanRequests);

while (!shutdown.signal.aborted) {
  try {
    const didWork = await pollScanRequests();
    if (!didWork) await sleep(IDLE_DELAY_MS, undefined, { signal: shutdown.signal });
  } catch (err) {
    if (shutdown.signal.aborted) break;
    console.error('[worker] error en el ciclo de la cola', err);
    await sleep(IDLE_DELAY_MS).catch(() => {});
  }
}
