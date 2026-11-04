import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { DroneForm } from './drone-form';
import { Drone } from './drone.models';
import { DroneService } from './drone.service';

type LoadState = 'loading' | 'loaded' | 'failed';

/**
 * Lists all drones with their availability (REQ-002) and embeds the form that adds drones (REQ-001).
 * The backend delivers the drones already ordered by name and derives the availability, so the page
 * shows them as received and reloads the list after a drone was created.
 * A failed request is reported by the global error toast, so the page only leaves out the list.
 */
@Component({
  selector: 'app-drones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block space-y-6' },
  imports: [DroneForm, HlmBadge, HlmCardImports, HlmTableImports],
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
                        <td hlmTd>{{ drone.description || '—' }}</td>
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
export class DronesPage {
  private readonly droneService = inject(DroneService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<LoadState>('loading');
  readonly drones = signal<readonly Drone[]>([]);

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
}
