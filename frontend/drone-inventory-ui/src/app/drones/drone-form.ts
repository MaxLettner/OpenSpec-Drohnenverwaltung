import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { CreateDroneRequest, Drone } from './drone.models';
import { DroneService } from './drone.service';

/**
 * Creates a drone from a name and an optional description (REQ-001). The form offers no status:
 * a new drone is Available and its availability is derived from its loans by the backend.
 * On success the fields are cleared and `created` tells the page to reload the list.
 * On failure the fields keep their values; the global error toast shows the backend message.
 */
@Component({
  selector: 'app-drone-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="drone-form" (submit)="onSubmit($event)">
      <h2>Add drone</h2>

      <div class="field">
        <label for="drone-name">Name</label>
        <input
          id="drone-name"
          type="text"
          name="name"
          maxlength="100"
          required
          [value]="name()"
          (input)="onNameInput($event)"
        />
      </div>

      <div class="field">
        <label for="drone-description">Description</label>
        <textarea
          id="drone-description"
          name="description"
          maxlength="500"
          rows="3"
          [value]="description()"
          (input)="onDescriptionInput($event)"
        ></textarea>
      </div>

      <button type="submit" [disabled]="!canSubmit()">Create drone</button>
    </form>
  `,
  styles: `
    .drone-form {
      display: grid;
      gap: 0.75rem;
      max-width: 36rem;
      margin-bottom: 2rem;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
    }

    .field {
      display: grid;
      gap: 0.25rem;
    }

    input,
    textarea {
      font: inherit;
      padding: 0.4rem 0.5rem;
      border: 1px solid #aaa;
      border-radius: 4px;
    }

    button {
      justify-self: start;
      font: inherit;
      padding: 0.4rem 1rem;
      border-radius: 4px;
      border: 1px solid #1e4620;
      background: #1e4620;
      color: #fff;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class DroneForm {
  private readonly droneService = inject(DroneService);

  /** Emits the created drone once the backend has accepted it. */
  readonly created = output<Drone>();

  readonly name = signal('');
  readonly description = signal('');
  readonly submitting = signal(false);

  /** A blank name (empty or only whitespace) and a running request both disable the button. */
  readonly canSubmit = computed(() => this.name().trim() !== '' && !this.submitting());

  onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.canSubmit()) {
      return;
    }

    const name = this.name().trim();
    const description = this.description().trim();
    const request: CreateDroneRequest = description ? { name, description } : { name };

    this.submitting.set(true);
    this.droneService.create(request).subscribe({
      next: (drone) => {
        this.name.set('');
        this.description.set('');
        this.submitting.set(false);
        this.created.emit(drone);
      },
      error: () => this.submitting.set(false),
    });
  }
}
