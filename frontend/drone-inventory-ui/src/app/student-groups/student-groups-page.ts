import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { RetireDialog, RetireDialogData } from '../shared/retire-dialog/retire-dialog';
import { LoadState } from '../shared/load-state';
import {
  StudentGroupEditDialog,
  StudentGroupEditDialogData,
} from './student-group-edit-dialog';
import {
  StudentGroupDetailsDialog,
  StudentGroupDetailsDialogData,
} from './student-group-details-dialog';
import { StudentGroupForm } from './student-group-form';
import { StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/**
 * Lists the student groups (REQ-003) and embeds the form that creates them. The backend delivers
 * the groups already ordered by name, so the page shows them as received and reloads the list
 * after a group was created. Clicking a group name opens its details in a dialog
 * (student-group spec "Show student group details").
 */
@Component({
  selector: 'app-student-groups-page',
  imports: [StudentGroupForm, HlmButton, HlmCardImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Student groups</h1>

    <app-student-group-form (created)="loadGroups()" />

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
                      <th hlmTh scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (group of groups(); track group.id) {
                      <tr hlmTr>
                        <td hlmTd>
                          <button
                            type="button"
                            class="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
                            [attr.aria-label]="'Details of ' + group.name"
                            (click)="openDetails(group)"
                          >
                            {{ group.name }}
                          </button>
                        </td>
                        <td hlmTd class="space-x-2">
                          <button
                            hlmBtn
                            variant="outline"
                            size="sm"
                            type="button"
                            [attr.aria-label]="'Edit ' + group.name"
                            (click)="openEdit(group)"
                          >
                            Edit
                          </button>
                          <button
                            hlmBtn
                            variant="outline"
                            size="sm"
                            type="button"
                            [attr.aria-label]="'Retire ' + group.name"
                            (click)="openRetire(group)"
                          >
                            Retire
                          </button>
                        </td>
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
  private readonly dialog = inject(Dialog);

  protected readonly state = signal<LoadState>('loading');
  protected readonly groups = signal<readonly StudentGroup[]>([]);

  constructor() {
    this.loadGroups();
  }

  /** Reloads the list so that it is in the backend's order (by name, ignoring case). */
  protected loadGroups(): void {
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

  /** Opens the details dialog of a group (design D3). */
  protected openDetails(group: StudentGroup): void {
    this.dialog.open<void, StudentGroupDetailsDialogData>(StudentGroupDetailsDialog, {
      data: { studentGroupId: group.id },
      ariaLabelledBy: 'student-group-details-title',
      autoFocus: 'first-tabbable',
    });
  }

  /**
   * Asks for confirmation and retires the group (design D5). A rejection, e.g. the group has an
   * active loan, is reported by the error toast and leaves the list as it is.
   */
  protected openRetire(group: StudentGroup): void {
    this.dialog
      .open<boolean, RetireDialogData>(RetireDialog, {
        data: { name: group.name },
        ariaLabelledBy: 'retire-dialog-title',
        autoFocus: 'first-tabbable',
      })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.service
            .retire(group.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: () => this.loadGroups(), error: () => undefined });
        }
      });
  }

  /** Opens the edit dialog; a save reloads the list (design D5). */
  protected openEdit(group: StudentGroup): void {
    this.dialog.open<void, StudentGroupEditDialogData>(StudentGroupEditDialog, {
      data: { group, saved: () => this.loadGroups() },
      ariaLabelledBy: 'student-group-edit-title',
      autoFocus: 'first-tabbable',
    });
  }
}
