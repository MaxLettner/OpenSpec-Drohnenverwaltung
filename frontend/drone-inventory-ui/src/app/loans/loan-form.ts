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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmNativeSelectImports } from '@spartan-ng/helm/native-select';
import { Drone } from '../drones/drone.models';
import { DroneService } from '../drones/drone.service';
import { StudentGroup } from '../student-groups/student-group.models';
import { StudentGroupService } from '../student-groups/student-group.service';
import { CreateLoanRequest, Loan, LoanItem } from './loan.models';
import { LoanService } from './loan.service';

type LoadState = 'loading' | 'loaded' | 'failed';

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

/** Reads the id of the option chosen in a select; the placeholder option gives null. */
function readOptionId(event: Event): number | null {
  const value = (event.target as HTMLSelectElement).value;
  return value === '' ? null : Number(value);
}

/**
 * Loans a drone to a student group with optional batteries and propellers (REQ-004, REQ-006).
 * Only drones that are Available are offered (REQ-005). An empty quantity sends no item of that
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
  imports: [HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmNativeSelectImports],
  template: `
    <section hlmCard>
      <div hlmCardHeader>
        <h2 hlmCardTitle>New loan</h2>
      </div>
      <div hlmCardContent>
        <form class="grid max-w-xl gap-4" novalidate (submit)="onSubmit($event)">
          <div class="grid gap-2">
            <label hlmLabel for="loan-drone">Drone</label>
            @switch (droneState()) {
              @case ('loading') {
                <p class="text-sm text-muted-foreground">Loading drones...</p>
              }
              @case ('loaded') {
                @if (availableDrones().length === 0) {
                  <p class="text-sm text-muted-foreground">No drones available.</p>
                } @else {
                  <hlm-native-select
                    class="w-full"
                    [selectId]="'loan-drone'"
                    [value]="selectedDroneId()?.toString() ?? ''"
                    (change)="onDroneChange($event)"
                  >
                    <option value="" [selected]="selectedDroneId() === null">Choose a drone</option>
                    @for (drone of availableDrones(); track drone.id) {
                      <option [value]="drone.id" [selected]="drone.id === selectedDroneId()">
                        {{ drone.name }}
                      </option>
                    }
                  </hlm-native-select>
                }
              }
            }
          </div>

          <div class="grid gap-2">
            <label hlmLabel for="loan-group">Student group</label>
            @switch (groupState()) {
              @case ('loading') {
                <p class="text-sm text-muted-foreground">Loading student groups...</p>
              }
              @case ('loaded') {
                @if (groups().length === 0) {
                  <p class="text-sm text-muted-foreground">No student groups yet.</p>
                } @else {
                  <hlm-native-select
                    class="w-full"
                    [selectId]="'loan-group'"
                    [value]="selectedGroupId()?.toString() ?? ''"
                    (change)="onGroupChange($event)"
                  >
                    <option value="" [selected]="selectedGroupId() === null">Choose a group</option>
                    @for (group of groups(); track group.id) {
                      <option [value]="group.id" [selected]="group.id === selectedGroupId()">
                        {{ group.name }}
                      </option>
                    }
                  </hlm-native-select>
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

  protected onDroneChange(event: Event): void {
    this.selectedDroneId.set(readOptionId(event));
  }

  protected onGroupChange(event: Event): void {
    this.selectedGroupId.set(readOptionId(event));
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
          // 409: the drone is no longer available. Reloading removes it from the drone select.
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
  }

  /** Loads the drones; a drone that is no longer available is deselected. */
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
        },
        // The error interceptor has already shown the message.
        error: () => this.groupState.set('failed'),
      });
  }
}
