import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';

/** What the page hands to the dialog: the name of the drone or student group to retire. */
export interface RetireDialogData {
  name: string;
}

/**
 * Asks for confirmation before a drone or student group is retired (design D5). Closes with
 * `true` for "Retire" and with `false` for "Cancel" or Escape; the page does the request.
 */
@Component({
  selector: 'app-retire-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton],
  host: {
    'data-slot': 'card',
    class:
      'block w-[min(28rem,calc(100vw-2rem))] rounded-xl border bg-card p-6 text-card-foreground shadow-lg',
  },
  template: `
    <p id="retire-dialog-title" class="text-base">
      Retire {{ data.name }}? It disappears from the lists and the loan form, the history keeps it.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button hlmBtn variant="ghost" type="button" (click)="close(false)">Cancel</button>
      <button hlmBtn variant="destructive" type="button" (click)="close(true)">Retire</button>
    </div>
  `,
})
export class RetireDialog {
  protected readonly data = inject<RetireDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
