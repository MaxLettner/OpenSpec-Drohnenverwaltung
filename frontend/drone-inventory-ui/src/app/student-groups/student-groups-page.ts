import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/** Maximum length of a student group name, as in the backend (REQ-003). */
export const MAX_STUDENT_GROUP_NAME_LENGTH = 100;

/** Rejects names that consist only of whitespace; the backend trims and rejects them too. */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { blank: true } : null;
}

/**
 * Lists the student groups and creates new ones (REQ-003).
 * The backend validates and trims the name and answers duplicates with 409; the
 * error interceptor shows those messages, so this page only keeps the entered name.
 */
@Component({
  selector: 'app-student-groups-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Student groups</h1>

    <section aria-labelledby="create-student-group-heading">
      <h2 id="create-student-group-heading">Create student group</h2>
      <form [formGroup]="form" (ngSubmit)="createGroup()">
        <label for="student-group-name">Name</label>
        <input
          id="student-group-name"
          type="text"
          formControlName="name"
          maxlength="100"
          autocomplete="off"
        />
        <button type="submit" [disabled]="form.invalid || saving()">Create</button>
      </form>
    </section>

    <section aria-labelledby="student-group-list-heading">
      <h2 id="student-group-list-heading">Student groups</h2>
      @if (groups(); as list) {
        @if (list.length === 0) {
          <p>No student groups yet.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              @for (group of list; track group.id) {
                <tr>
                  <td>{{ group.name }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
  styles: `
    form {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }

    input {
      min-width: 16rem;
    }

    table {
      border-collapse: collapse;
    }

    th,
    td {
      padding: 0.4rem 1rem 0.4rem 0;
      text-align: left;
    }
  `,
})
export class StudentGroupsPage implements OnInit {
  private readonly service = inject(StudentGroupService);
  private readonly destroyRef = inject(DestroyRef);

  /** Undefined until the first list response arrives, so the empty state is not shown too early. */
  protected readonly groups = signal<readonly StudentGroup[] | undefined>(undefined);
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(MAX_STUDENT_GROUP_NAME_LENGTH),
        notBlank,
      ],
    }),
  });

  ngOnInit(): void {
    this.loadGroups();
  }

  protected createGroup(): void {
    if (this.form.invalid || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.service
      .create({ name: this.form.getRawValue().name })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.form.reset();
          this.saving.set(false);
          this.loadGroups();
        },
        // The error interceptor has already shown the message; keep the entered name.
        error: () => this.saving.set(false),
      });
  }

  /** Reloads the list so that it is in the backend's order (by name, ignoring case). */
  private loadGroups(): void {
    this.service
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => this.groups.set(groups),
        // The error interceptor has already shown the message.
        error: () => undefined,
      });
  }
}
