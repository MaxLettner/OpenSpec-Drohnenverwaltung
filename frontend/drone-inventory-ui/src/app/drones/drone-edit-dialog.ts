import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { errorMessage } from '../shared/http/error-toast.interceptor';
import { Drone, MAX_DRONE_DESCRIPTION_LENGTH, MAX_DRONE_NAME_LENGTH } from './drone.models';
import { DroneService } from './drone.service';

/** What the Drones page hands to the dialog: the drone to edit, and what to do after a save. */
export interface DroneEditDialogData {
  drone: Drone;
  saved: () => void;
}

/**
 * Edits the name and description of a drone (drone spec "Edit a drone", design D5). The fields
 * start with the current values. A rejected save keeps the dialog open and shows the backend
 * message inside it.
 */
@Component({
  selector: 'app-drone-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmInput, HlmLabel, HlmTextarea],
  host: {
    'data-slot': 'card',
    class:
      'block max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg',
  },
  template: `
    <h2 id="drone-edit-title" class="text-lg font-semibold">Edit drone</h2>
    <form class="mt-4 grid gap-4" (submit)="onSubmit($event)">
      <div class="grid gap-2">
        <label hlmLabel for="edit-drone-name">Name</label>
        <input
          hlmInput
          id="edit-drone-name"
          type="text"
          name="name"
          [attr.maxlength]="maxNameLength"
          required
          [value]="name()"
          (input)="onNameInput($event)"
        />
      </div>
      <div class="grid gap-2">
        <label hlmLabel for="edit-drone-description">Description</label>
        <textarea
          hlmTextarea
          id="edit-drone-description"
          name="description"
          [attr.maxlength]="maxDescriptionLength"
          rows="3"
          [value]="description()"
          (input)="onDescriptionInput($event)"
        ></textarea>
      </div>
      @if (error(); as message) {
        <p role="alert" data-field="error" class="text-sm text-destructive">{{ message }}</p>
      }
      <div class="flex justify-end gap-2">
        <button hlmBtn variant="ghost" type="button" (click)="close()">Cancel</button>
        <button hlmBtn type="submit" [disabled]="!canSubmit()">Save</button>
      </div>
    </form>
  `,
})
export class DroneEditDialog {
  private readonly data = inject<DroneEditDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly droneService = inject(DroneService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxNameLength = MAX_DRONE_NAME_LENGTH;
  protected readonly maxDescriptionLength = MAX_DRONE_DESCRIPTION_LENGTH;

  protected readonly name = signal(this.data.drone.name);
  protected readonly description = signal(this.data.drone.description ?? '');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  /** A blank name and a running request both disable the button. */
  protected readonly canSubmit = computed(() => this.name().trim() !== '' && !this.submitting());

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.droneService
      .update(this.data.drone.id, {
        name: this.name().trim(),
        description: this.description().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.data.saved();
          this.dialogRef.close();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (error instanceof HttpErrorResponse) {
            this.error.set(errorMessage(error));
          }
        },
      });
  }
}
