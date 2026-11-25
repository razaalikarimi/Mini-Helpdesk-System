import { registerActivityLogListener } from './activityLogListener';
import { registerEmailListener } from './emailListener';
import { registerNotificationListener } from './notificationListener';

let listenersRegistered = false;

export function registerEventListeners(): void {
  if (listenersRegistered) return;

  registerActivityLogListener();
  registerNotificationListener();
  registerEmailListener();

  listenersRegistered = true;
}
