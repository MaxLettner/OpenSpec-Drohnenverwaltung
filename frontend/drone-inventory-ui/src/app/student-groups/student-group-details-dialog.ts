import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { DateDisplayPipe } from '../shared/date-display.pipe';
import { LoanService } from '../loans/loan.service';
import { StudentGroupDetails } from './student-group.models';
import { StudentGroupService } from './student-group.service';

/** What the opening page hands to the dialog: the group, and optionally what to do after a return. */
export interface StudentGroupDetailsDialogData {
  studentGroupId: number;
  returned?: () => void;
}

/**
 * The details of one student group (student-group spec "Show student group details", design D3):
 * all active loans with a "Return" action each, and the last returned loans. Built like the drone
 * details dialog: the CDK dialog traps the focus, closes on Escape and gives the focus back.
 */
@Component({
  selector: 'app-student-group-details-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateDisplayPipe, HlmButton],
  host: {
    // Lets the card border highlight reach the dialog too (design D7).
    'data-slot': 'card',
    class:
      'block max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg',
  },
  template: `
    @if (details(); as group) {
      <h2 id="student-group-details-title" class="text-lg font-semibold">{{ group.name }}</h2>

      <section class="mt-5" aria-labelledby="student-group-active-loans">
        <h3 id="student-group-active-loans" class="text-sm font-medium">Active loans</h3>
        @if (group.activeLoans.length === 0) {
          <p class="mt-2 text-sm text-muted-foreground">No active loans.</p>
        }
        @for (loan of group.activeLoans; track loan.id) {
          <article class="mt-3 rounded-lg border p-4" data-active-loan>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt class="text-muted-foreground">Drone</dt>
              <dd data-field="drone">{{ loan.drone }}</dd>
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
              [attr.aria-label]="'Return ' + loan.drone"
              [disabled]="returning()"
              (click)="returnLoan(loan.id)"
            >
              Return
            </button>
          </article>
        }
      </section>

      <section class="mt-6" aria-labelledby="student-group-recent-loans">
        <h3 id="student-group-recent-loans" class="text-sm font-medium">Recent loans</h3>
        @if (group.recentLoans.length === 0) {
          <p class="mt-2 text-sm text-muted-foreground">No returned loans yet.</p>
        } @else {
          <ul class="mt-2 divide-y text-sm">
            @for (loan of group.recentLoans; track loan.id) {
              <li class="flex justify-between gap-4 py-2">
                <span>{{ loan.drone }}</span>
                <span class="text-muted-foreground"
                  >{{ loan.loanDate | dateDisplay }} to {{ loan.returnDate | dateDisplay }}</span
                >
              </li>
            }
          </ul>
        }
      </section>
    } @else {
      <p class="text-sm text-muted-foreground">Loading student group...</p>
    }

    <button hlmBtn variant="ghost" size="sm" type="button" class="mt-6 w-full" (click)="close()">
      Close
    </button>
  `,
})
export class StudentGroupDetailsDialog {
  private readonly data = inject<StudentGroupDetailsDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef);
  private readonly groupService = inject(StudentGroupService);
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly details = signal<StudentGroupDetails | null>(null);
  protected readonly returning = signal(false);

  constructor() {
    this.load();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  /** Returns one active loan (REQ-008) and reloads, so the loan moves to the returned loans. */
  protected returnLoan(loanId: number): void {
    this.returning.set(true);
    this.loanService
      .return(loanId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.returning.set(false);
          this.data.returned?.();
          this.load();
        },
        error: () => this.returning.set(false),
      });
  }

  private load(): void {
    this.groupService
      .details(this.data.studentGroupId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (details) => this.details.set(details),
        // The error toast has already said why; there is nothing to show.
        error: () => this.close(),
      });
  }
}
