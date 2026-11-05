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
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/** Maximum length of a student group name, as in the backend (REQ-003). */
const MAX_STUDENT_GROUP_NAME_LENGTH = 100;

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
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmTableImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Student groups</h1>

    <section hlmCard aria-labelledby="create-student-group-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="create-student-group-heading">Create student group</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" [formGroup]="form" (ngSubmit)="createGroup()">
          <div class="grid gap-2">
            <label hlmLabel for="student-group-name">Name</label>
            <input
              hlmInput
              id="student-group-name"
              type="text"
              formControlName="name"
              maxlength="100"
              autocomplete="off"
            />
          </div>
          <div>
            <button hlmBtn type="submit" [disabled]="form.invalid || saving()">Create</button>
          </div>
        </form>
      </div>
    </section>

    <section hlmCard aria-labelledby="student-group-list-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="student-group-list-heading">Student groups</h2>
      </div>
      <div hlmCardContent>
        @if (groups(); as list) {
          @if (list.length === 0) {
            <p class="text-sm text-muted-foreground">No student groups yet.</p>
          } @else {
            <div hlmTableContainer>
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh scope="col">Name</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (group of list; track group.id) {
                    <tr hlmTr>
                      <td hlmTd>{{ group.name }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    </section>
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
