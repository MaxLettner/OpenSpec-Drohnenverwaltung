import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { LoadState } from '../shared/load-state';
import { MAX_STUDENT_GROUP_NAME_LENGTH, StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/**
 * Lists the student groups and creates new ones (REQ-003).
 * The backend validates and trims the name and answers duplicates with 409; the error interceptor
 * shows those messages, so this page only keeps the entered name after a failure.
 */
@Component({
  selector: 'app-student-groups-page',
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Student groups</h1>

    <section hlmCard aria-labelledby="create-student-group-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="create-student-group-heading">Create student group</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" (submit)="createGroup($event)">
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

    <section hlmCard aria-labelledby="student-group-list-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="student-group-list-heading">Student groups</h2>
      </div>
      <div hlmCardContent>
        @switch (state()) {
          @case ('loading') {
            <p class="text-sm text-muted-foreground">Loading student groups...</p>
          }
          @case ('loaded') {
            @if (groups().length === 0) {
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
                    @for (group of groups(); track group.id) {
                      <tr hlmTr>
                        <td hlmTd>{{ group.name }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('failed') {
            <p class="text-sm text-muted-foreground">The student groups could not be loaded.</p>
          }
        }
      </div>
    </section>
  `,
})
export class StudentGroupsPage {
  private readonly service = inject(StudentGroupService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly maxNameLength = MAX_STUDENT_GROUP_NAME_LENGTH;
  protected readonly state = signal<LoadState>('loading');
  protected readonly groups = signal<readonly StudentGroup[]>([]);
  protected readonly name = signal('');
  protected readonly saving = signal(false);

  /** A blank name (empty or only whitespace) and a running request both disable the button. */
  protected readonly canSubmit = computed(() => this.name().trim() !== '' && !this.saving());

  constructor() {
    this.loadGroups();
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected createGroup(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    this.saving.set(true);
    this.service
      .create({ name: this.name().trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.name.set('');
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
        next: (groups) => {
          this.groups.set(groups);
          this.state.set('loaded');
        },
        // The error interceptor has already shown the message; the page says the list is missing.
        error: () => this.state.set('failed'),
      });
  }
}
