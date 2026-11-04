import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
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
  host: { class: 'block' },
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmTextarea],
  template: `
    <section hlmCard aria-labelledby="drone-form-title">
      <div hlmCardHeader>
        <h2 hlmCardTitle id="drone-form-title">Add drone</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" (submit)="onSubmit($event)">
          <div class="grid gap-2">
            <label hlmLabel for="drone-name">Name</label>
            <input
              hlmInput
              id="drone-name"
              type="text"
              name="name"
              maxlength="100"
              required
              [value]="name()"
              (input)="onNameInput($event)"
            />
          </div>

          <div class="grid gap-2">
            <label hlmLabel for="drone-description">Description</label>
            <textarea
              hlmTextarea
              id="drone-description"
              name="description"
              maxlength="500"
              rows="3"
              [value]="description()"
              (input)="onDescriptionInput($event)"
            ></textarea>
          </div>

          <div>
            <button hlmBtn type="submit" [disabled]="!canSubmit()">Create drone</button>
          </div>
        </form>
      </div>
    </section>
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
