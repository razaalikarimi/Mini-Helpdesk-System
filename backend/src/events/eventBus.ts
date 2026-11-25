import { EventEmitter } from 'events';
import { logger } from '../config/logger';
import { AppEvent, EventPayloads } from './eventTypes';

type AsyncEventListener<K extends AppEvent> = (payload: EventPayloads[K]) => Promise<void> | void;

class EventBus {
  private static instance: EventBus;
  private readonly emitter: EventEmitter;
  private readonly pendingTasks: Set<Promise<void>>;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(30);
    this.pendingTasks = new Set();
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public emitEvent<K extends AppEvent>(event: K, payload: EventPayloads[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  public onEvent<K extends AppEvent>(event: K, listener: AsyncEventListener<K>): void {
    this.emitter.on(event, (payload: EventPayloads[K]) => {
      const task = Promise.resolve()
        .then(() => listener(payload))
        .catch((error: unknown) => {
          logger.error(
            { err: error, event, ticketId: payload.ticketId },
            `Event listener error for ${event}`,
          );
        })
        .finally(() => {
          this.pendingTasks.delete(task);
        });

      this.pendingTasks.add(task);
    });
  }

  /**
   * Wait for all currently queued async listeners to settle (useful in tests & graceful shutdown).
   */
  public async flush(): Promise<void> {
    while (this.pendingTasks.size > 0) {
      await Promise.allSettled(Array.from(this.pendingTasks));
    }
  }
}

export const eventBus = EventBus.getInstance();
