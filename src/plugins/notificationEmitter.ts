import { EventEmitter } from 'events';

export type NotificationEventType = 'notification_event';

export interface INotificationEvent {
  event: NotificationEventType;
  notification_id: string;
  recipient_id: string;
  sender_id?: string | null;
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
}

class NotificationEmitter extends EventEmitter {}

const notificationEmitter = new NotificationEmitter();
notificationEmitter.setMaxListeners(300);

export default notificationEmitter;
