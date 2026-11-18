import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { LoadState } from '../shared/load-state';
import { DroneForm } from './drone-form';
import { Drone } from './drone.models';
import { DroneService } from './drone.service';
import { LoanService } from '../loans/loan.service';

/**
 * Lists all drones with their availability (REQ-002) and embeds the form that adds drones (REQ-001).
 * Every Available drone has a "Loan" link that opens the loan form with that drone chosen (REQ-004),
 * every Loaned drone a "Return" button that returns its active loan and reloads the list (REQ-008).
 * The backend delivers the drones already ordered by name and derives the availability, so the page
 * shows them as received and reloads the list after a drone was created.
 * A failed request is reported by the global error toast, so the page only leaves out the list.
 */
@Component({
  selector: 'app-drones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  imports: [DroneForm, RouterLink, HlmBadge, HlmButton, HlmCardImports, HlmTableImports],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Drones</h1>

    <app-drone-form (created)="reload()" />

    @switch (state()) {
      @case ('loading') {
        <p class="text-sm text-muted-foreground">Loading drones...</p>
      }
      @case ('loaded') {
        @if (drones().length === 0) {
          <p class="text-sm text-muted-foreground">No drones yet.</p>
        } @else {
          <section hlmCard aria-labelledby="drone-list-title">
            <div hlmCardHeader>
              <h2 hlmCardTitle id="drone-list-title">All drones</h2>
            </div>
            <div hlmCardContent>
              <div hlmTableContainer>
                <table hlmTable>
                  <thead hlmTHead>
                    <tr hlmTr>
                      <th hlmTh scope="col">Name</th>
                      <th hlmTh scope="col">Availability</th>
                      <th hlmTh scope="col">Description</th>
                      <th hlmTh scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody hlmTBody>
                    @for (drone of drones(); track drone.id) {
                      <tr hlmTr>
                        <td hlmTd>{{ drone.name }}</td>
                        <td hlmTd>
                          @if (drone.availability === 'Available') {
                            <span
                              hlmBadge
                              variant="outline"
                              class="border-success bg-success/20 text-foreground"
                              >Available</span
                            >
                          } @else {
                            <span
                              hlmBadge
                              variant="outline"
                              class="border-warning bg-warning/20 text-foreground"
                              >Loaned</span
                            >
                          }
                        </td>
                        <!-- Wraps, so that a long description does not push the Loan link out of view. -->
                        <td hlmTd class="min-w-48 whitespace-normal">
                          {{ drone.description || '—' }}
                        </td>
                        <td hlmTd>
                          @if (drone.availability === 'Available') {
                            <a
                              hlmBtn
                              variant="outline"
                              size="sm"
                              routerLink="/loans"
                              [queryParams]="{ droneId: drone.id }"
                              [attr.aria-label]="'Loan ' + drone.name"
                              >Loan</a
                            >
                          } @else if (drone.activeLoanId !== null) {
                            <button
                              hlmBtn
                              variant="outline"
                              size="sm"
                              type="button"
                              [disabled]="returningIds().has(drone.activeLoanId)"
                              [attr.aria-label]="'Return ' + drone.name"
                              (click)="returnLoan(drone.activeLoanId)"
                            >
                              Return
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        }
      }
      @case ('failed') {
        <p class="text-sm text-muted-foreground">The drones could not be loaded.</p>
      }
    }
  `,
})
export class DronesPage {
  private readonly droneService = inject(DroneService);
  private readonly loanService = inject(LoanService);
  private readonly destroyRef = inject(DestroyRef);

  /** Ids of the loans whose return request is running; their Return button is disabled. */
  protected readonly returningIds = signal<ReadonlySet<number>>(new Set());
  protected readonly state = signal<LoadState>('loading');
  protected readonly drones = signal<readonly Drone[]>([]);

  constructor() {
    this.reload();
  }

  /** Loads the drones from the backend, e.g. after a drone was created (REQ-002). */
  reload(): void {
    this.droneService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (drones) => {
          this.drones.set(drones);
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }

  /**
   * Returns a drone's active loan (REQ-008) and reloads the list, so the drone shows as Available.
   * A rejected return is reported by the error toast and leaves the list as it is.
   */
  returnLoan(loanId: number): void {
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
          this.reload();
        },
        error: () => this.setReturning(loanId, false),
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
