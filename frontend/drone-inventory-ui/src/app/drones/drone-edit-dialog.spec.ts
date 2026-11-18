import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { Drone } from './drone.models';
import { DronesPage } from './drones-page';

/** drone spec: Edit a drone (REQ-001). */
describe('Drone edit dialog', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;

  const drones: Drone[] = [
    { id: 7, name: 'TELLO-07', description: 'spare', availability: 'Available', activeLoanId: null },
    { id: 8, name: 'TELLO-08', description: null, availability: 'Available', activeLoanId: null },
  ];

  const dialog = () => document.querySelector<HTMLElement>('app-drone-edit-dialog');
  const nameInput = () => dialog()!.querySelector<HTMLInputElement>('#edit-drone-name')!;
  const descriptionInput = () =>
    dialog()!.querySelector<HTMLTextAreaElement>('#edit-drone-description')!;
  const save = () =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Save')!;

  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function openEdit(name: string): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>(`button[aria-label="Edit ${name}"]`)!
      .click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush(drones);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('opens with the current values and marks the dialog as a card', () => {
    openEdit('TELLO-07');

    expect(dialog()!.getAttribute('data-slot')).toBe('card');
    expect(nameInput().value).toBe('TELLO-07');
    expect(descriptionInput().value).toBe('spare');
  });

  it('Rename a drone: saves with PUT, closes the dialog and reloads the list', () => {
    openEdit('TELLO-07');

    type(nameInput(), ' TELLO-07B ');
    type(descriptionInput(), 'New propeller guard');
    save().click();
    const put = http.expectOne({ method: 'PUT', url: '/api/drones/7' });
    expect(put.request.body).toEqual({ name: 'TELLO-07B', description: 'New propeller guard' });
    put.flush({ ...drones[0], name: 'TELLO-07B', description: 'New propeller guard' });
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ ...drones[0], name: 'TELLO-07B', description: 'New propeller guard' }, drones[1]]);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    const rows = (fixture.nativeElement as HTMLElement).textContent;
    expect(rows).toContain('TELLO-07B');
    expect(rows).toContain('New propeller guard');
  });

  it('Name taken by another drone: the dialog stays open and shows the error', () => {
    openEdit('TELLO-08');

    type(nameInput(), 'tello-07');
    save().click();
    http
      .expectOne({ method: 'PUT', url: '/api/drones/8' })
      .flush(
        { status: 409, detail: 'A drone named "tello-07" already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(dialog()).not.toBeNull();
    expect(dialog()!.querySelector('[data-field="error"]')!.textContent).toContain(
      'A drone named "tello-07" already exists.',
    );
    expect(nameInput().value).toBe('tello-07');
  });

  it('Invalid name: a blank name cannot be saved', () => {
    openEdit('TELLO-07');

    type(nameInput(), '   ');

    expect(save().disabled).toBe(true);
  });

  it('Cancel closes the dialog without a request', () => {
    openEdit('TELLO-07');

    Array.from(dialog()!.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Cancel')!
      .click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
  });
});
