import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { ActiveLoanRow } from './loan.models';
import { LoanService } from './loan.service';

type LoadState = 'loading' | 'loaded' | 'failed';

/**
 * Lists the active loans with group, drone, accessory quantities and loan date (REQ-007)
 * and returns a loan from its row (REQ-008). The backend decides which loans are active and
 * in which order they come; a returned loan is removed from the list locally.
 * A failed request is reported by the global error toast, so the row simply stays.
 *
 * The loan form (task 10.4) is meant to sit in its own section above the active loan list.
 * After a loan was created, that form can call `loadActiveLoans()` to refresh the list.
 */
@Component({
  selector: 'app-loans-page',
  imports: [DateDisplayPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Loans</h1>

    <section aria-labelledby="active-loans-heading">
      <h2 id="active-loans-heading">Active loans</h2>

      @switch (state()) {
        @case ('loading') {
          <p>Loading active loans...</p>
        }
        @case ('loaded') {
          @if (loans().length === 0) {
            <p>No active loans.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">Drone</th>
                  <th scope="col">Batteries</th>
                  <th scope="col">Propellers</th>
                  <th scope="col">Loan Date</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (loan of loans(); track loan.id) {
                  <tr>
                    <td>{{ loan.group }}</td>
                    <td>{{ loan.drone }}</td>
                    <td>{{ loan.batteries }}</td>
                    <td>{{ loan.propellers }}</td>
                    <td>{{ loan.loanDate | dateDisplay }}</td>
                    <td>
                      <button
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
          }
        }
      }
    </section>
  `,
  styles: `
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #ddd;
    }
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
