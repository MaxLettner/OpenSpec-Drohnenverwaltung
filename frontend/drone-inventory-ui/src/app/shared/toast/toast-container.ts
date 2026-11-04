import { Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { ToastService } from './toast.service';

/** Renders the toasts of the ToastService in the corner of the screen. Rendered once in the app shell. */
@Component({
  selector: 'app-toast-container',
  imports: [HlmButton],
  template: `
    <div class="fixed right-4 bottom-4 z-50 flex max-w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast border-destructive/40 bg-destructive/10 text-foreground border-l-destructive flex items-start gap-3 rounded-md border border-l-4 p-3 text-sm shadow-md"
          role="alert"
        >
          <span class="toast-message flex-1 pt-1">{{ toast.message }}</span>
          <button
            hlmBtn
            variant="ghost"
            size="icon-sm"
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
})
export class ToastContainer {
  readonly toastService = inject(ToastService);
}
