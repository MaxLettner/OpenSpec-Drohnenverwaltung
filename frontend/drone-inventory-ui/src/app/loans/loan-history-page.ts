import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DroneDetailsDialog, DroneDetailsDialogData } from '../drones/drone-details-dialog';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { LoadState } from '../shared/load-state';
import { LoadingRows } from '../shared/loading-rows';
import {
  StudentGroupDetailsDialog,
  StudentGroupDetailsDialogData,
} from '../student-groups/student-group-details-dialog';
import { LoanHistoryRow } from './loan.models';
import { LoanService } from './loan.service';

/**
 * Lists the returned loans with their loan and return dates (REQ-010). The backend only
 * delivers returned loans, already in its order (latest return first), so the page shows them
 * as received. A failed request is reported by the global error toast, so the page only
 * leaves out the list.
 */
@Component({
  selector: 'app-loan-history-page',
  host: { class: 'block space-y-6' },
  imports: [LoadingRows, DateDisplayPipe, HlmCardImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">History</h1>

    <section hlmCard aria-labelledby="loan-history-title">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="loan-history-title">Returned loans</h2>
      </div>
      <div hlmCardContent>
        @switch (state()) {
          @case ('loading') {
            <app-loading-rows label="Loading loan history..." />
          }
          @case ('loaded') {
            @if (rows().length === 0) {
              <p class="text-sm text-muted-foreground">No returned loans yet.</p>
            } @else {
              <div hlmTableContainer>
                <table hlmTable>
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh scope="col">Group</th>
                      <th hlmTh scope="col">Drone</th>
                      <th hlmTh scope="col">Batteries</th>
                      <th hlmTh scope="col">Propellers</th>
                      <th hlmTh scope="col">Loan Date</th>
                      <th hlmTh scope="col">Return Date</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (row of rows(); track row.id) {
                      <tr hlmTr class="list-row" [style.--row]="$index">
                        <td hlmTd>
                          <button
                            type="button"
                            class="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
                            [attr.aria-label]="'Details of ' + row.group"
                            (click)="openGroup(row)"
                          >
                            {{ row.group }}
                          </button>
                        </td>
                        <td hlmTd>
                          <button
                            type="button"
                            class="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
                            [attr.aria-label]="'Details of ' + row.drone"
                            (click)="openDrone(row)"
                          >
                            {{ row.drone }}
                          </button>
                        </td>
                        <td hlmTd>{{ row.batteries }}</td>
                        <td hlmTd>{{ row.propellers }}</td>
                        <td hlmTd>{{ row.loanDate | dateDisplay }}</td>
                        <td hlmTd>{{ row.returnDate | dateDisplay }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }
          @case ('failed') {
            <p class="text-sm text-muted-foreground">The loan history could not be loaded.</p>
          }
        }
      </div>
    </section>
  `,
})
export class LoanHistoryPage {
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);

  protected readonly state = signal<LoadState>('loading');
  protected readonly rows = signal<readonly LoanHistoryRow[]>([]);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loanService
      .listHistory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }

  /** Opens the group details (design D4); a return made there adds a row, so the list reloads. */
  protected openGroup(row: LoanHistoryRow): void {
    this.dialog.open<void, StudentGroupDetailsDialogData>(StudentGroupDetailsDialog, {
      data: { studentGroupId: row.studentGroupId, returned: () => this.reload() },
      ariaLabelledBy: 'student-group-details-title',
      autoFocus: 'first-tabbable',
    });
  }

  /** Opens the drone details (design D4); a return made there adds a row, so the list reloads. */
  protected openDrone(row: LoanHistoryRow): void {
    this.dialog.open<void, DroneDetailsDialogData>(DroneDetailsDialog, {
      data: { droneId: row.droneId, returned: () => this.reload() },
      ariaLabelledBy: 'drone-details-title',
      autoFocus: 'first-tabbable',
    });
  }
}
