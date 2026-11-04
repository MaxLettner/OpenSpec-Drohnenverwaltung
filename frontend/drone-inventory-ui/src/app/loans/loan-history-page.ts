import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
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
  host: { class: 'block space-y-6' },
  imports: [DateDisplayPipe, HlmCardImports, HlmTableImports],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">History</h1>

    @switch (state()) {
      @case ('loading') {
        <p class="text-sm text-muted-foreground">Loading loan history...</p>
      }
      @case ('loaded') {
        @if (rows().length === 0) {
          <p class="text-sm text-muted-foreground">No returned loans yet.</p>
        } @else {
          <section hlmCard aria-labelledby="loan-history-title">
            <div hlmCardHeader>
              <h2 hlmCardTitle id="loan-history-title">Returned loans</h2>
            </div>
            <div hlmCardContent>
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
                      <tr hlmTr>
                        <td hlmTd>{{ row.group }}</td>
                        <td hlmTd>{{ row.drone }}</td>
                        <td hlmTd>{{ row.batteries }}</td>
                        <td hlmTd>{{ row.propellers }}</td>
                        <td hlmTd>{{ row.loanDate | dateDisplay }}</td>
                        <td hlmTd>{{ row.returnDate | dateDisplay }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        }
      }
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
