import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  output,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { Drone } from '../drones/drone.models';
import { DroneService } from '../drones/drone.service';
import { LoadState } from '../shared/load-state';
import { OptionPicker } from '../shared/option-picker/option-picker';
import { StudentGroup } from '../student-groups/student-group.models';
import { StudentGroupService } from '../student-groups/student-group.service';
import { CreateLoanRequest, Loan, LoanItem } from './loan.models';
import { LoanService } from './loan.service';

/**
 * An accessory quantity as typed: `undefined` when the field is empty (no item is sent),
 * `null` when it is not a whole number of 0 or more.
 */
type Quantity = number | undefined | null;

/** Reads the quantity typed into a number input (REQ-006). */
function readQuantity(event: Event): Quantity {
  const input = event.target as HTMLInputElement;
  // A half-typed entry such as "-" reads as an empty value, but the browser flags it as bad input.
  if (input.validity.badInput) {
    return null;
  }
  const text = input.value.trim();
  if (text === '') {
    return undefined;
  }
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Chooses the only option of a list when nothing is chosen yet (loan spec "Choose a single option
 * automatically", design D4). A choice the user made, or a list of several options, stays as it is.
 */
function chooseSingleOption(
  chosenId: WritableSignal<number | null>,
  options: readonly { id: number }[],
): void {
  if (chosenId() === null && options.length === 1) {
    chosenId.set(options[0].id);
  }
}

/**
 * Loans a drone to a student group with optional batteries and propellers (REQ-004, REQ-006).
 * Only drones that are Available are offered (REQ-005); drones and groups are chosen with the
 * OptionPicker (a list for a few options, a search box for many). An empty quantity sends no item of that
 * type, a typed 0 sends an item with quantity 0. The button stays disabled until a drone and a
 * group are chosen and both quantities are whole numbers of 0 or more.
 * On success the fields are cleared, the drone list is reloaded and `loaned` tells the page to
 * refresh its lists. On failure the entered values are kept and the global error toast shows the
 * backend message; after a 409 the drone list is reloaded so that the drone disappears.
 */
@Component({
  selector: 'app-loan-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, OptionPicker],
  template: `
    <section hlmCard>
      <div hlmCardHeader>
        <h2 hlmCardTitle>New loan</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" novalidate (submit)="onSubmit($event)">
          <div class="grid gap-2">
            <label hlmLabel id="loan-drone-label" for="loan-drone">Drone</label>
            @switch (droneState()) {
              @case ('loading') {
                <p class="text-sm text-muted-foreground">Loading drones...</p>
              }
              @case ('loaded') {
                @if (availableDrones().length === 0) {
                  <p class="text-sm text-muted-foreground">No drones available.</p>
                } @else {
                  <app-option-picker
                    inputId="loan-drone"
                    labelId="loan-drone-label"
                    noMatchText="No drone matches."
                    [options]="availableDrones()"
                    [(chosenId)]="selectedDroneId"
                  />
                }
              }
            }
          </div>

          <div class="grid gap-2">
            <label hlmLabel id="loan-group-label" for="loan-group">Student group</label>
            @switch (groupState()) {
              @case ('loading') {
                <p class="text-sm text-muted-foreground">Loading student groups...</p>
              }
              @case ('loaded') {
                @if (groups().length === 0) {
                  <p class="text-sm text-muted-foreground">No student groups yet.</p>
                } @else {
                  <app-option-picker
                    inputId="loan-group"
                    labelId="loan-group-label"
                    noMatchText="No student group matches."
                    [options]="groups()"
                    [(chosenId)]="selectedGroupId"
                  />
                }
              }
            }
          </div>

          <div class="grid gap-2">
            <label hlmLabel for="loan-batteries">Batteries</label>
            <input
              hlmInput
              #batteriesInput
              id="loan-batteries"
              name="batteries"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="optional"
              (input)="onBatteriesInput($event)"
            />
          </div>

          <div class="grid gap-2">
            <label hlmLabel for="loan-propellers">Propellers</label>
            <input
              hlmInput
              #propellersInput
              id="loan-propellers"
              name="propellers"
              type="number"
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="optional"
              (input)="onPropellersInput($event)"
            />
          </div>

          @if (quantitiesInvalid()) {
            <p class="text-sm text-destructive">
              Batteries and propellers must be whole numbers, 0 or more.
            </p>
          }

          <button hlmBtn type="submit" class="justify-self-start" [disabled]="!canSubmit()">
            Loan drone
          </button>
        </form>
      </div>
    </section>
  `,
})
export class LoanForm {
  private readonly loanService = inject(LoanService);
  private readonly droneService = inject(DroneService);
  private readonly studentGroupService = inject(StudentGroupService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emits the created Loan once the backend has accepted it. */
  readonly loaned = output<Loan>();

  private readonly batteriesInput =
    viewChild.required<ElementRef<HTMLInputElement>>('batteriesInput');
  private readonly propellersInput =
    viewChild.required<ElementRef<HTMLInputElement>>('propellersInput');

  protected readonly droneState = signal<LoadState>('loading');
  protected readonly drones = signal<readonly Drone[]>([]);
  protected readonly groupState = signal<LoadState>('loading');
  protected readonly groups = signal<readonly StudentGroup[]>([]);

  /** Only drones that are Available can be picked (REQ-005); the backend derives availability. */
  protected readonly availableDrones = computed(() =>
    this.drones().filter((drone) => drone.availability === 'Available'),
  );

  protected readonly selectedDroneId = signal<number | null>(null);
  protected readonly selectedGroupId = signal<number | null>(null);
  protected readonly batteries = signal<Quantity>(undefined);
  protected readonly propellers = signal<Quantity>(undefined);
  protected readonly submitting = signal(false);

  protected readonly quantitiesInvalid = computed(
    () => this.batteries() === null || this.propellers() === null,
  );

  /** The body to send, or null while a drone or group is missing or a quantity is invalid. */
  private readonly request = computed<CreateLoanRequest | null>(() => {
    const droneId = this.selectedDroneId();
    const studentGroupId = this.selectedGroupId();
    const batteries = this.batteries();
    const propellers = this.propellers();
    if (droneId === null || studentGroupId === null || batteries === null || propellers === null) {
      return null;
    }

    const items: LoanItem[] = [];
    if (batteries !== undefined) {
      items.push({ type: 'Battery', quantity: batteries });
    }
    if (propellers !== undefined) {
      items.push({ type: 'Propeller', quantity: propellers });
    }
    return items.length > 0 ? { droneId, studentGroupId, items } : { droneId, studentGroupId };
  });

  protected readonly canSubmit = computed(() => this.request() !== null && !this.submitting());

  constructor() {
    this.loadDrones();
    this.loadStudentGroups();
  }

  /**
   * Reloads the drone list, e.g. after a loan was returned elsewhere on the page (REQ-008), so that
   * the returned drone is offered again. The chosen group and the quantities stay as they are.
   */
  reloadDrones(): void {
    this.loadDrones();
  }

  protected onBatteriesInput(event: Event): void {
    this.batteries.set(readQuantity(event));
  }

  protected onPropellersInput(event: Event): void {
    this.propellers.set(readQuantity(event));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    const request = this.request();
    if (request === null || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.loanService
      .create(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (loan) => {
          this.submitting.set(false);
          this.resetForm();
          this.loadDrones();
          this.loaned.emit(loan);
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          // 409: the drone is no longer available. Reloading removes it from the offered drones.
          // The error interceptor has already shown the message for every other status.
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.loadDrones();
          }
        },
      });
  }

  private resetForm(): void {
    this.selectedDroneId.set(null);
    this.selectedGroupId.set(null);
    this.batteries.set(undefined);
    this.propellers.set(undefined);
    this.batteriesInput().nativeElement.value = '';
    this.propellersInput().nativeElement.value = '';
    // The drone is chosen again, if it is the only one, when the drone list is reloaded after the
    // loan: the current list still offers the drone that was just loaned.
    chooseSingleOption(this.selectedGroupId, this.groups());
  }

  /**
   * Loads the drones; a drone that is no longer available is deselected, and the only available
   * drone is chosen when nothing is.
   */
  private loadDrones(): void {
    this.droneService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (drones) => {
          this.drones.set(drones);
          this.droneState.set('loaded');
          const selected = this.selectedDroneId();
          const stillAvailable = drones.some(
            (drone) => drone.id === selected && drone.availability === 'Available',
          );
          if (selected !== null && !stillAvailable) {
            this.selectedDroneId.set(null);
          }
          chooseSingleOption(this.selectedDroneId, this.availableDrones());
        },
        // The error interceptor has already shown the message.
        error: () => this.droneState.set('failed'),
      });
  }

  private loadStudentGroups(): void {
    this.studentGroupService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          this.groups.set(groups);
          this.groupState.set('loaded');
          chooseSingleOption(this.selectedGroupId, groups);
        },
        // The error interceptor has already shown the message.
        error: () => this.groupState.set('failed'),
      });
  }
}
