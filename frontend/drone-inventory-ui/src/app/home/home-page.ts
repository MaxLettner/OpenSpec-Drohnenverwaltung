import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBatteryMedium, lucideFan } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { LoadState } from '../shared/load-state';
import { LoanService } from '../loans/loan.service';
import { Dashboard } from './dashboard.models';
import { DashboardService } from './dashboard.service';

/** Circumference of the availability ring (r = 52), for the stroke-dasharray of its arcs. */
const RING = 2 * Math.PI * 52;

/**
 * The Home page (dashboard spec): live figures from `GET /api/dashboard`, a ring chart of the fleet
 * availability, the accessories out, the longest active loans with a Return action and the loans per
 * week. Charts are plain SVG and CSS with their numbers as text (design D6). After a return the
 * figures are loaded again; a rejected return is reported by the error toast and changes nothing.
 */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  imports: [DateDisplayPipe, NgIcon, HlmButton, HlmCardImports, HlmTableImports],
  providers: [provideIcons({ lucideBatteryMedium, lucideFan })],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Home</h1>

    @switch (state()) {
      @case ('loading') {
        <p class="text-sm text-muted-foreground">Loading figures...</p>
      }
      @case ('failed') {
        <p class="text-sm text-muted-foreground">The figures could not be loaded.</p>
      }
      @case ('loaded') {
        @if (dashboard(); as d) {
          <section aria-label="Totals" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            @for (stat of totals(); track stat.key) {
              <div hlmCard class="gap-1 py-4">
                <div hlmCardContent>
                  <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
                  <p class="text-3xl font-semibold tabular-nums" [attr.data-stat]="stat.key">
                    {{ stat.value }}
                  </p>
                </div>
              </div>
            }
          </section>

          <div class="grid gap-6 lg:grid-cols-2">
            <section hlmCard aria-labelledby="fleet-heading">
              <div hlmCardHeader>
                <h2 hlmCardTitle id="fleet-heading">Fleet availability</h2>
              </div>
              <div hlmCardContent class="flex flex-wrap items-center gap-6">
                <svg
                  viewBox="0 0 120 120"
                  class="size-36 shrink-0 -rotate-90"
                  role="img"
                  [attr.aria-label]="
                    d.drones.available +
                    ' of ' +
                    d.drones.total +
                    ' drones available, ' +
                    d.drones.loaned +
                    ' loaned'
                  "
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    class="stroke-muted"
                    stroke-width="14"
                  />
                  @if (d.drones.total > 0) {
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      class="stroke-success"
                      stroke-width="14"
                      [attr.stroke-dasharray]="arc(d.drones.available, d.drones.total)"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      class="stroke-warning"
                      stroke-width="14"
                      [attr.stroke-dasharray]="arc(d.drones.loaned, d.drones.total)"
                      [attr.stroke-dashoffset]="-ringLength(d.drones.available, d.drones.total)"
                    />
                  }
                </svg>
                <ul class="space-y-2 text-sm">
                  <li class="flex items-center gap-2">
                    <span class="size-3 rounded-full bg-success" aria-hidden="true"></span>
                    <span
                      ><strong class="tabular-nums" data-stat="available">{{
                        d.drones.available
                      }}</strong>
                      available</span
                    >
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="size-3 rounded-full bg-warning" aria-hidden="true"></span>
                    <span
                      ><strong class="tabular-nums" data-stat="loaned">{{
                        d.drones.loaned
                      }}</strong>
                      loaned</span
                    >
                  </li>
                </ul>
              </div>
            </section>

            <section hlmCard aria-labelledby="accessories-heading">
              <div hlmCardHeader>
                <h2 hlmCardTitle id="accessories-heading">Accessories out now</h2>
              </div>
              <div hlmCardContent class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <ng-icon
                    name="lucideBatteryMedium"
                    class="text-primary"
                    size="28"
                    aria-hidden="true"
                  />
                  <div>
                    <p class="text-3xl font-semibold tabular-nums" data-stat="batteries">
                      {{ d.accessoriesOut.batteries }}
                    </p>
                    <p class="text-sm text-muted-foreground">Batteries</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <ng-icon name="lucideFan" class="text-primary" size="28" aria-hidden="true" />
                  <div>
                    <p class="text-3xl font-semibold tabular-nums" data-stat="propellers">
                      {{ d.accessoriesOut.propellers }}
                    </p>
                    <p class="text-sm text-muted-foreground">Propellers</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section hlmCard aria-labelledby="longest-heading">
            <div hlmCardHeader>
              <h2 hlmCardTitle id="longest-heading">Longest active loans</h2>
            </div>
            <div hlmCardContent>
              @if (d.longestActiveLoans.length === 0) {
                <p class="text-sm text-muted-foreground">No active loans.</p>
              } @else {
                <div hlmTableContainer>
                  <table hlmTable>
                    <thead hlmTHead>
                      <tr hlmTr>
                        <th hlmTh scope="col">Group</th>
                        <th hlmTh scope="col">Drone</th>
                        <th hlmTh scope="col">Loan Date</th>
                        <th hlmTh scope="col">Days out</th>
                        <th hlmTh scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody hlmTBody>
                      @for (loan of d.longestActiveLoans; track loan.id) {
                        <tr hlmTr>
                          <td hlmTd>{{ loan.group }}</td>
                          <td hlmTd>{{ loan.drone }}</td>
                          <td hlmTd>{{ loan.loanDate | dateDisplay }}</td>
                          <td hlmTd class="tabular-nums">{{ loan.daysOut }}</td>
                          <td hlmTd>
                            <button
                              hlmBtn
                              variant="outline"
                              size="sm"
                              type="button"
                              [disabled]="returningIds().has(loan.id)"
                              [attr.aria-label]="'Return ' + loan.drone"
                              (click)="returnLoan(loan.id)"
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
            </div>
          </section>

          <section hlmCard aria-labelledby="weeks-heading">
            <div hlmCardHeader>
              <h2 hlmCardTitle id="weeks-heading">Loans per week</h2>
            </div>
            <div hlmCardContent>
              <ol class="flex h-48 items-end gap-2 sm:gap-3">
                @for (week of d.loansPerWeek; track week.weekStart) {
                  <li
                    class="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    [attr.data-week]="week.weekStart"
                    [attr.aria-label]="
                      'Week of ' +
                      (week.weekStart | dateDisplay) +
                      ': ' +
                      week.count +
                      (week.count === 1 ? ' loan' : ' loans')
                    "
                  >
                    <span class="text-xs font-medium tabular-nums" aria-hidden="true">{{
                      week.count
                    }}</span>
                    <span
                      class="w-full max-w-10 rounded-t-md bg-primary/80"
                      [style.height.%]="barHeight(week.count)"
                      aria-hidden="true"
                    ></span>
                    <span
                      class="text-[0.7rem] text-muted-foreground tabular-nums"
                      aria-hidden="true"
                      >{{ shortDate(week.weekStart) }}</span
                    >
                  </li>
                }
              </ol>
            </div>
          </section>
        }
      }
    }
  `,
})
export class HomePage {
  private readonly dashboardService = inject(DashboardService);
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<LoadState>('loading');
  protected readonly dashboard = signal<Dashboard | null>(null);
  protected readonly returningIds = signal<ReadonlySet<number>>(new Set());

  protected readonly totals = computed(() => {
    const d = this.dashboard();
    return d
      ? [
          { key: 'drones', label: 'Drones', value: d.drones.total },
          { key: 'studentGroups', label: 'Student groups', value: d.studentGroups },
          { key: 'activeLoans', label: 'Active loans', value: d.loans.active },
          { key: 'returnedLoans', label: 'Returned loans', value: d.loans.returned },
        ]
      : [];
  });

  private readonly maxWeekCount = computed(() =>
    Math.max(1, ...(this.dashboard()?.loansPerWeek.map((week) => week.count) ?? [])),
  );

  constructor() {
    this.load();
  }

  protected ringLength(part: number, total: number): number {
    return (part / total) * RING;
  }

  protected arc(part: number, total: number): string {
    return `${this.ringLength(part, total)} ${RING}`;
  }

  /** Bar height in percent of the column; an empty week keeps a sliver so the axis stays visible. */
  protected barHeight(count: number): number {
    return Math.max(2, (count / this.maxWeekCount()) * 80);
  }

  /** `yyyy-MM-dd` as `dd.MM.`, short enough for eight bars on a phone. */
  protected shortDate(iso: string): string {
    return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  }

  protected returnLoan(loanId: number): void {
    if (this.returningIds().has(loanId)) {
      return;
    }
    this.setReturning(loanId, true);
    this.loanService
      .return(loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setReturning(loanId, false);
          this.load();
        },
        error: () => this.setReturning(loanId, false),
      });
  }

  private load(): void {
    this.dashboardService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dashboard) => {
          this.dashboard.set(dashboard);
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
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
