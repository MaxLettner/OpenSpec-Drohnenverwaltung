import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DroneForm } from './drone-form';
import { Drone } from './drone.models';

describe('DroneForm (REQ-001)', () => {
  let fixture: ComponentFixture<DroneForm>;
  let http: HttpTestingController;

  const element = () => fixture.nativeElement as HTMLElement;
  const nameInput = () => element().querySelector<HTMLInputElement>('#drone-name')!;
  const descriptionInput = () =>
    element().querySelector<HTMLTextAreaElement>('#drone-description')!;
  const submitButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  /** Types into the field the way the user does, so that the component's input handler runs. */
  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    submitButton().click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DroneForm);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('keeps the create button disabled while the name is blank (REQ-001)', () => {
    expect(submitButton().disabled).toBe(true);

    type(nameInput(), '   ');
    expect(submitButton().disabled).toBe(true);

    type(nameInput(), 'TELLO-07');
    expect(submitButton().disabled).toBe(false);

    type(nameInput(), '');
    expect(submitButton().disabled).toBe(true);
  });

  it('offers no status or availability field (REQ-001)', () => {
    expect(element().querySelector('select')).toBeNull();

    const fields = Array.from(element().querySelectorAll('input, textarea, select')).map(
      (field) => field.id,
    );
    expect(fields).toEqual(['drone-name', 'drone-description']);

    const labels = Array.from(element().querySelectorAll('label')).map((label) =>
      label.textContent?.trim(),
    );
    expect(labels).toEqual(['Name', 'Description']);
    expect(element().textContent?.toLowerCase()).not.toContain('status');
    expect(element().textContent?.toLowerCase()).not.toContain('availability');
  });

  it('sends the trimmed name and description and clears the fields after success (REQ-001)', () => {
    let created: Drone | undefined;
    fixture.componentInstance.created.subscribe((drone) => (created = drone));

    type(nameInput(), '  TELLO-07 ');
    type(descriptionInput(), ' SSID: TELLO-9FA21B ');
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(req.request.body).toEqual({ name: 'TELLO-07', description: 'SSID: TELLO-9FA21B' });
    const drone: Drone = {
      id: 7,
      name: 'TELLO-07',
      description: 'SSID: TELLO-9FA21B',
      availability: 'Available',
    };
    req.flush(drone, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(created).toEqual(drone);
    expect(nameInput().value).toBe('');
    expect(descriptionInput().value).toBe('');
    expect(submitButton().disabled).toBe(true);
  });

  it('sends only the name when the description is blank (REQ-001)', () => {
    type(nameInput(), 'TELLO-08');
    type(descriptionInput(), '   ');
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(req.request.body).toEqual({ name: 'TELLO-08' });
    req.flush({ id: 8, name: 'TELLO-08', description: null, availability: 'Available' });
  });

  it('disables the create button while the request is running (REQ-001)', () => {
    type(nameInput(), 'TELLO-07');
    submit();

    expect(submitButton().disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: '/api/drones' });
    // A second click while the request runs must not send another drone.
    submit();
    http.expectNone({ method: 'POST', url: '/api/drones' });

    req.flush(
      { id: 7, name: 'TELLO-07', description: null, availability: 'Available' },
      { status: 201, statusText: 'Created' },
    );
  });

  it('keeps the entered values and emits nothing when the backend rejects the drone (REQ-001)', () => {
    let emitted = false;
    fixture.componentInstance.created.subscribe(() => (emitted = true));

    type(nameInput(), 'TELLO-07');
    type(descriptionInput(), 'right propeller guard damaged');
    submit();

    http
      .expectOne({ method: 'POST', url: '/api/drones' })
      .flush(
        { title: 'A drone with this name already exists.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(emitted).toBe(false);
    expect(nameInput().value).toBe('TELLO-07');
    expect(descriptionInput().value).toBe('right propeller guard damaged');
    expect(submitButton().disabled).toBe(false);
  });
});
