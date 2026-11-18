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
import { errorMessage } from '../shared/http/error-toast.interceptor';
import { MAX_STUDENT_GROUP_NAME_LENGTH, StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/** What the Student groups page hands to the dialog: the group to edit, and what to do after a save. */
export interface StudentGroupEditDialogData {
  group: StudentGroup;
  saved: () => void;
}

/**
 * Edits the name of a student group (student group spec "Edit a student group", design D5). The
 * field starts with the current name. A rejected save keeps the dialog open and shows the backend
 * message inside it.
 */
@Component({
  selector: 'app-student-group-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, HlmInput, HlmLabel],
  host: {
    'data-slot': 'card',
    class:
      'block max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg',
  },
  template: `
    <h2 id="student-group-edit-title" class="text-lg font-semibold">Edit student group</h2>
    <form class="mt-4 grid gap-4" (submit)="onSubmit($event)">
      <div class="grid gap-2">
        <label hlmLabel for="edit-student-group-name">Name</label>
        <input
          hlmInput
          id="edit-student-group-name"
          type="text"
          name="name"
          [attr.maxlength]="maxNameLength"
          autocomplete="off"
          [value]="name()"
          (input)="onNameInput($event)"
        />
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
export class StudentGroupEditDialog {
  private readonly data = inject<StudentGroupEditDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly service = inject(StudentGroupService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxNameLength = MAX_STUDENT_GROUP_NAME_LENGTH;

  protected readonly name = signal(this.data.group.name);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  /** A blank name and a running request both disable the button. */
  protected readonly canSubmit = computed(() => this.name().trim() !== '' && !this.submitting());

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
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
    this.service
      .update(this.data.group.id, { name: this.name().trim() })
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
