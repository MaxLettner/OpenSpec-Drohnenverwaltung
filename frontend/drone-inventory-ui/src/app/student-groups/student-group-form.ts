import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { MAX_STUDENT_GROUP_NAME_LENGTH, StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/**
 * Creates a student group from a name (REQ-003). The backend validates and trims the name and
 * answers duplicates with 409. On success the field is cleared and `created` tells the page to
 * reload the list. On failure the name is kept; the global error toast shows the backend message.
 */
@Component({
  selector: 'app-student-group-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel],
  template: `
    <section hlmCard aria-labelledby="create-student-group-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="create-student-group-heading">Create student group</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" (submit)="onSubmit($event)">
          <div class="grid gap-2">
            <label hlmLabel for="student-group-name">Name</label>
            <input
              hlmInput
              id="student-group-name"
              type="text"
              name="name"
              [attr.maxlength]="maxNameLength"
              autocomplete="off"
              [value]="name()"
              (input)="onNameInput($event)"
            />
          </div>
          <div>
            <button hlmBtn type="submit" [disabled]="!canSubmit()">Create</button>
          </div>
        </form>
      </div>
    </section>
  `,
})
export class StudentGroupForm {
  private readonly service = inject(StudentGroupService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emits the created student group once the backend has accepted it. */
  readonly created = output<StudentGroup>();

  protected readonly maxNameLength = MAX_STUDENT_GROUP_NAME_LENGTH;

  protected readonly name = signal('');
  protected readonly submitting = signal(false);

  /** A blank name (empty or only whitespace) and a running request both disable the button. */
  protected readonly canSubmit = computed(() => this.name().trim() !== '' && !this.submitting());

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    this.submitting.set(true);
    this.service
      .create({ name: this.name().trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (group) => {
          this.name.set('');
          this.submitting.set(false);
          this.created.emit(group);
        },
        // The error interceptor has already shown the message; keep the entered name.
        error: () => this.submitting.set(false),
      });
  }
}
