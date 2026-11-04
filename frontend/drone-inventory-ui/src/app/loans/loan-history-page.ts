import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { LoanHistoryRow } from './loan.models';
import { LoanService } from './loan.service';

type LoadState = 'loading' | 'loaded' | 'failed';

/**
 * Lists the returned loans with their loan and return dates (REQ-010). The backend only
 * delivers returned loans, already in its order (latest return first), so the page shows them
 * as received. A failed request is reported by the global error toast, so the page only
 * leaves out the list.
 */
@Component({
  selector: 'app-loan-history-page',
  imports: [DateDisplayPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>History</h1>

    @switch (state()) {
      @case ('loading') {
        <p>Loading loan history...</p>
      }
      @case ('loaded') {
        @if (rows().length === 0) {
          <p>No returned loans yet.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">Drone</th>
                <th scope="col">Batteries</th>
                <th scope="col">Propellers</th>
                <th scope="col">Loan Date</th>
                <th scope="col">Return Date</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr>
                  <td>{{ row.group }}</td>
                  <td>{{ row.drone }}</td>
                  <td>{{ row.batteries }}</td>
                  <td>{{ row.propellers }}</td>
                  <td>{{ row.loanDate | dateDisplay }}</td>
                  <td>{{ row.returnDate | dateDisplay }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    }
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
export class LoanHistoryPage {
  private readonly loanService = inject(LoanService);

  readonly state = signal<LoadState>('loading');
  readonly rows = signal<readonly LoanHistoryRow[]>([]);

  constructor() {
    this.loanService
      .listHistory()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }
}
