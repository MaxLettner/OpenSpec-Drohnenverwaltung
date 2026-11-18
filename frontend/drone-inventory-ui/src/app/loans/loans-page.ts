import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
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
import { ActiveLoanRow } from './loan.models';
import { LoanForm } from './loan-form';
import { LoanService } from './loan.service';

/**
 * Lists the active loans with group, drone, accessory quantities and loan date (REQ-007)
 * and returns a loan from its row (REQ-008). The backend decides which loans are active and
 * in which order they come; a returned loan is removed from the list locally.
 * A failed request is reported by the global error toast, so the row simply stays.
 *
 * The loan form (REQ-004) sits above the list and calls `loadActiveLoans()` after a loan was created.
 * After a return the page asks the form to reload its drones, so the returned drone is offered again.
 */
function parseDroneId(value: string | undefined): number | undefined {
  const id = Number(value);
  return value !== undefined && Number.isInteger(id) ? id : undefined;
}

@Component({
  selector: 'app-loans-page',
  imports: [LoadingRows, DateDisplayPipe, LoanForm, HlmButton, HlmCardImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Loans</h1>

    <app-loan-form [initialDroneId]="droneId()" (loaned)="loadActiveLoans()" />

    <section hlmCard aria-labelledby="active-loans-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="active-loans-heading">Active loans</h2>
      </div>
      <div hlmCardContent>
        @switch (state()) {
          @case ('loading') {
            <app-loading-rows label="Loading active loans..." />
          }
          @case ('loaded') {
            @if (loans().length === 0) {
              <p class="text-sm text-muted-foreground">No active loans.</p>
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
                      <th hlmTh scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (loan of loans(); track loan.id) {
                      <tr hlmTr class="list-row" [style.--row]="$index">
                        <td hlmTd>
                          <button
                            type="button"
                            class="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
                            [attr.aria-label]="'Details of ' + loan.group"
                            (click)="openGroup(loan)"
                          >
                            {{ loan.group }}
                          </button>
                        </td>
                        <td hlmTd>
                          <button
                            type="button"
                            class="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2"
                            [attr.aria-label]="'Details of ' + loan.drone"
                            (click)="openDrone(loan)"
                          >
                            {{ loan.drone }}
                          </button>
                        </td>
                        <td hlmTd>{{ loan.batteries }}</td>
                        <td hlmTd>{{ loan.propellers }}</td>
                        <td hlmTd>{{ loan.loanDate | dateDisplay }}</td>
                        <td hlmTd>
                          <button
                            hlmBtn
                            variant="outline"
                            size="sm"
                            type="button"
                            [disabled]="returningIds().has(loan.id)"
                            (click)="returnLoan(loan)"
                          >
                            Return
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
            <p class="text-sm text-muted-foreground">The active loans could not be loaded.</p>
          }
        }
      </div>
    </section>
  `,
})
export class LoansPage {
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);

  /**
   * The drone to choose in the loan form, from `/loans?droneId=<id>` (loan spec "Open the loan form
   * with a chosen drone"). Anything that is not a whole number is ignored.
   */
  readonly droneId = input<number | undefined, string | undefined>(undefined, {
    transform: parseDroneId,
  });

  private readonly loanForm = viewChild(LoanForm);

  protected readonly state = signal<LoadState>('loading');
  protected readonly loans = signal<readonly ActiveLoanRow[]>([]);
  /** Ids of the loans whose return request is running; their return button is disabled. */
  protected readonly returningIds = signal<ReadonlySet<number>>(new Set());

  constructor() {
    this.loadActiveLoans();
  }

  /** Reloads the active loans in the order the backend delivers them. */
  loadActiveLoans(): void {
    this.loanService
      .listActive()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.loans.set(rows);
          this.state.set('loaded');
        },
        // The error interceptor has already shown the message.
        error: () => this.state.set('failed'),
      });
  }

  /** Opens the group details (design D1); a return made there updates the list and the form. */
  protected openGroup(loan: ActiveLoanRow): void {
    this.dialog.open<void, StudentGroupDetailsDialogData>(StudentGroupDetailsDialog, {
      data: { studentGroupId: loan.studentGroupId, returned: () => this.returnedInDialog() },
      ariaLabelledBy: 'student-group-details-title',
      autoFocus: 'first-tabbable',
    });
  }

  /** Opens the drone details (design D1); a return made there updates the list and the form. */
  protected openDrone(loan: ActiveLoanRow): void {
    this.dialog.open<void, DroneDetailsDialogData>(DroneDetailsDialog, {
      data: { droneId: loan.droneId, returned: () => this.returnedInDialog() },
      ariaLabelledBy: 'drone-details-title',
      autoFocus: 'first-tabbable',
    });
  }

  private returnedInDialog(): void {
    this.loadActiveLoans();
    this.loanForm()?.reloadDrones();
  }

  protected returnLoan(loan: ActiveLoanRow): void {
    if (this.returningIds().has(loan.id)) {
      return;
    }

    this.setReturning(loan.id, true);
    this.loanService
      .return(loan.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setReturning(loan.id, false);
          this.loans.update((rows) => rows.filter((row) => row.id !== loan.id));
          // The drone is available again (REQ-008): let the loan form offer it without a reload.
          this.loanForm()?.reloadDrones();
        },
        // The error interceptor has already shown the message; the row stays in the list.
        error: () => this.setReturning(loan.id, false),
      });
  }

  private setReturning(id: number, returning: boolean): void {
    this.returningIds.update((ids) => {
      const next = new Set(ids);
      if (returning) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
