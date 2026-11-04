import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  imports: [DroneForm],
  template: `
    <h1>Drones</h1>

    <app-drone-form (created)="reload()" />

    @switch (state()) {
      @case ('loading') {
        <p>Loading drones...</p>
      }
      @case ('loaded') {
        @if (drones().length === 0) {
          <p>No drones yet.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Availability</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              @for (drone of drones(); track drone.id) {
                <tr>
                  <td>{{ drone.name }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-available]="drone.availability === 'Available'"
                      [class.badge-loaned]="drone.availability === 'Loaned'"
                      >{{ drone.availability }}</span
                    >
                  </td>
                  <td>{{ drone.description || '—' }}</td>
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

    .badge {
      display: inline-block;
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      border: 1px solid currentColor;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .badge-available {
      background: #e6f4ea;
      color: #1e4620;
    }

    .badge-loaned {
      background: #fdf1d8;
      color: #6b4a00;
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
