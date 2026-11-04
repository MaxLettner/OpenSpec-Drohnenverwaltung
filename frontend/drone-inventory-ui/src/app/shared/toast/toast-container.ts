import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Renders the toasts of the ToastService in the corner of the screen. Rendered once in the app shell. */
@Component({
  selector: 'app-toast-container',
  template: `
    <div class="toast-stack">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" role="alert">
          <span class="toast-message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast-close"
            aria-label="Close notification"
            (click)="toastService.dismiss(toast.id)"
          >
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(360px, calc(100vw - 2rem));
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      background: #8a1c1c;
      color: #fff;
      box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
    }

    .toast-message {
      flex: 1;
    }

    .toast-close {
      border: 0;
      background: none;
      color: inherit;
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      padding: 0 0.25rem;
    }
  `,
})
export class ToastContainer {
  readonly toastService = inject(ToastService);
}
