import { Injectable, signal } from '@angular/core';

export interface Toast {
  readonly id: number;
  readonly message: string;
}

/** How long a toast stays on screen before it is dismissed automatically. */
export const TOAST_DURATION_MS = 5000;

/** Holds the messages shown to the user, e.g. backend errors (400/404/409). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastList = signal<readonly Toast[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextId = 1;

  readonly toasts = this.toastList.asReadonly();

  show(message: string): void {
    const id = this.nextId++;
    this.toastList.update((current) => [...current, { id, message }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), TOAST_DURATION_MS),
    );
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toastList.update((current) => current.filter((toast) => toast.id !== id));
  }
}
