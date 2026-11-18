import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { LoanService } from '../loans/loan.service';
import { DroneDetails } from './drone.models';
import { DroneService } from './drone.service';

/** What the Drones page hands to the dialog: the drone, and what to do after a return. */
export interface DroneDetailsDialogData {
  droneId: number;
  returned: () => void;
}

/**
 * The details of one drone (drone spec "Show drone details", design D5): availability, the active
 * loan with a "Return" action or a "Loan" action, and the last returned loans. A retired drone
 * shows "Retired" and no "Loan" action (manage-drones-and-groups design D4). Opened with the CDK
 * dialog, which traps the focus, closes on Escape and gives the focus back to the drone name.
 */
@Component({
  selector: 'app-drone-details-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateDisplayPipe, RouterLink, NgIcon, HlmBadge, HlmButton],
  providers: [provideIcons({ lucideX })],
  host: {
    // Lets the card border highlight reach the dialog too (design D7).
    'data-slot': 'card',
    class:
      'relative block max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg',
  },
  template: `
    <button
      hlmBtn
      variant="ghost"
      size="icon-sm"
      type="button"
      class="absolute top-3 right-3"
      aria-label="Close"
      (click)="close()"
    >
      <ng-icon name="lucideX" aria-hidden="true" />
    </button>

    @if (details(); as drone) {
      <div class="space-y-1 pr-8">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="drone-details-title" class="text-lg font-semibold">{{ drone.name }}</h2>
          @if (drone.retired) {
            <span hlmBadge variant="outline" class="text-muted-foreground">Retired</span>
          } @else if (drone.availability === 'Available') {
            <span hlmBadge variant="outline" class="border-success bg-success/20 text-foreground"
              >Available</span
            >
          } @else {
            <span hlmBadge variant="outline" class="border-warning bg-warning/20 text-foreground"
              >Loaned</span
            >
          }
        </div>
        <p class="text-sm text-muted-foreground">{{ drone.description || 'No description' }}</p>
      </div>

      @if (drone.activeLoan; as loan) {
        <section class="mt-5 rounded-lg border p-4" aria-labelledby="drone-active-loan">
          <h3 id="drone-active-loan" class="text-sm font-medium">Active loan</h3>
          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt class="text-muted-foreground">Group</dt>
            <dd data-field="group">{{ loan.group }}</dd>
            <dt class="text-muted-foreground">Loan date</dt>
            <dd data-field="loanDate">{{ loan.loanDate | dateDisplay }}</dd>
            <dt class="text-muted-foreground">Days out</dt>
            <dd data-field="daysOut">
              {{ loan.daysOut }} {{ loan.daysOut === 1 ? 'day' : 'days' }}
            </dd>
            <dt class="text-muted-foreground">Batteries</dt>
            <dd data-field="batteries">{{ loan.batteries }}</dd>
            <dt class="text-muted-foreground">Propellers</dt>
            <dd data-field="propellers">{{ loan.propellers }}</dd>
          </dl>
          <button
            hlmBtn
            class="mt-4"
            type="button"
            [disabled]="returning()"
            (click)="returnLoan(loan.id)"
          >
            Return
          </button>
        </section>
      } @else if (!drone.retired) {
        <a
          hlmBtn
          class="mt-5"
          routerLink="/loans"
          [queryParams]="{ droneId: drone.id }"
          (click)="close()"
          >Loan</a
        >
      }

      <section class="mt-6" aria-labelledby="drone-recent-loans">
        <h3 id="drone-recent-loans" class="text-sm font-medium">Recent loans</h3>
        @if (drone.recentLoans.length === 0) {
          <p class="mt-2 text-sm text-muted-foreground">No returned loans yet.</p>
        } @else {
          <ul class="mt-2 divide-y text-sm">
            @for (loan of drone.recentLoans; track loan.id) {
              <li class="flex justify-between gap-4 py-2">
                <span>{{ loan.group }}</span>
                <span class="text-muted-foreground"
                  >{{ loan.loanDate | dateDisplay }} to {{ loan.returnDate | dateDisplay }}</span
                >
              </li>
            }
          </ul>
        }
      </section>
    } @else {
      <p class="text-sm text-muted-foreground">Loading drone...</p>
    }
  `,
})
export class DroneDetailsDialog {
  private readonly data = inject<DroneDetailsDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly droneService = inject(DroneService);
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly details = signal<DroneDetails | null>(null);
  protected readonly returning = signal(false);

  constructor() {
    this.load();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  /** Returns the active loan (REQ-008); a rejected return leaves the details as they are. */
  protected returnLoan(loanId: number): void {
    this.returning.set(true);
    this.loanService
      .return(loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.returning.set(false);
          this.data.returned();
          this.load();
        },
        error: () => this.returning.set(false),
      });
  }

  private load(): void {
    this.droneService
      .details(this.data.droneId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => this.details.set(details),
        // The error toast has already said why; there is nothing to show.
        error: () => this.close(),
      });
  }
}
