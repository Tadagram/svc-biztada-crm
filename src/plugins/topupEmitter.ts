/**
 * Singleton EventEmitter for real-time top-up SSE broadcasts.
 * All handlers import this single instance so every SSE client receives events.
 *
 * Scale note: this is in-process only — works for single-instance deployment.
 * Migrate to Redis pub/sub when horizontal scaling is needed.
 */
import { EventEmitter } from 'events';

export type TopUpEventType = 'new_topup' | 'topup_approved' | 'topup_rejected';

export interface ITopUpEvent {
  event: TopUpEventType;
  topup_id: string;
  user_id: string;
  amount: string; // Decimal serialized as string
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_note?: string;
}

class TopUpEmitter extends EventEmitter {}

const topupEmitter = new TopUpEmitter();
topupEmitter.setMaxListeners(200); // support up to 200 concurrent SSE clients

export default topupEmitter;
