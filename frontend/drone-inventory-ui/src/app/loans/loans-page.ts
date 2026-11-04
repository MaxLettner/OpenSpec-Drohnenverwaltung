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
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { ActiveLoanRow } from './loan.models';
import { LoanForm } from './loan-form';
import { LoanService } from './loan.service';

type LoadState = 'loading' | 'loaded' | 'failed';

/**
 * Lists the active loans with group, drone, accessory quantities and loan date (REQ-007)
 * and returns a loan from its row (REQ-008). The backend decides which loans are active and
 * in which order they come; a returned loan is removed from the list locally.
 * A failed request is reported by the global error toast, so the row simply stays.
 *
 * The loan form (REQ-004) sits above the list and calls `loadActiveLoans()` after a loan was created.
 */
@Component({
  selector: 'app-loans-page',
  imports: [DateDisplayPipe, LoanForm, HlmButton, HlmCardImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Loans</h1>

    <app-loan-form (loaned)="loadActiveLoans()" />

    <section hlmCard aria-labelledby="active-loans-heading">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="active-loans-heading">Active loans</h2>
      </div>
      <div hlmCardContent>
        @switch (state()) {
          @case ('loading') {
            <p class="text-sm text-muted-foreground">Loading active loans...</p>
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
                      <tr hlmTr>
                        <td hlmTd>{{ loan.group }}</td>
                        <td hlmTd>{{ loan.drone }}</td>
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
        }
      </div>
    </section>
  `,
})
export class LoansPage implements OnInit {
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly loans = signal<readonly ActiveLoanRow[]>([]);
  /** Ids of the loans whose return request is running; their return button is disabled. */
  protected readonly returningIds = signal<ReadonlySet<number>>(new Set());

  ngOnInit(): void {
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
