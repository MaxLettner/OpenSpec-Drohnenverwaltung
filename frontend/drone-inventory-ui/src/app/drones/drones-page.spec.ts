import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { DronesPage } from './drones-page';

describe('DronesPage (REQ-001, REQ-002)', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const element = () => fixture.nativeElement as HTMLElement;

  /** Text of every table row as the cells of name, availability and description. */
  const rows = () =>
    Array.from(element().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );

  const nameInput = () => element().querySelector<HTMLInputElement>('#drone-name')!;
  const descriptionInput = () =>
    element().querySelector<HTMLTextAreaElement>('#drone-description')!;
  const submitButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  /** Types into a field of the drone form the way the user does. */
  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(DronesPage);
  });

  afterEach(() => http.verify());

  it('shows the loading state until the drones have arrived (REQ-002)', () => {
    fixture.detectChanges();
    expect(element().textContent).toContain('Loading drones...');
    expect(element().querySelector('table')).toBeNull();

    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    fixture.detectChanges();
    expect(element().textContent).not.toContain('Loading drones...');
  });

  it('lists a loaned and an available drone with their availability text (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([
      { id: 1, name: 'TELLO-02', description: 'SSID: TELLO-1A2B3C', availability: 'Loaned' },
      { id: 2, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
    ]);
    fixture.detectChanges();

    expect(rows()).toEqual([
      ['TELLO-02', 'Loaned', 'SSID: TELLO-1A2B3C'],
      ['TELLO-07', 'Available', 'SSID: TELLO-9FA21B'],
    ]);

    const badges = Array.from(element().querySelectorAll<HTMLElement>('tbody [data-slot="badge"]'));
    expect(badges.map((badge) => badge.textContent?.trim())).toEqual(['Loaned', 'Available']);
    expect(badges[0].className).toContain('bg-warning/20');
    expect(badges[1].className).toContain('bg-success/20');
    expect(badges[0].className).not.toEqual(badges[1].className);
  });

  it('shows the drones in the shared table style inside a card (ui-theme)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ id: 2, name: 'TELLO-07', description: null, availability: 'Available' }]);
    fixture.detectChanges();

    expect(
      element().querySelector(
        '[data-slot="card"] div[data-slot="table-container"] table[data-slot="table"]',
      ),
    ).not.toBeNull();
    expect(element().querySelector('h1')?.textContent).toBe('Drones');
  });

  it('shows an em dash when a drone has no description (REQ-002)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ id: 3, name: 'TELLO-08', description: null, availability: 'Available' }]);
    fixture.detectChanges();

    expect(rows()).toEqual([['TELLO-08', 'Available', '—']]);
  });

  it('shows the empty state when no drone exists (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    fixture.detectChanges();

    expect(element().textContent).toContain('No drones yet.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('keeps the order in which the backend delivers the drones (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([
      { id: 5, name: 'ALPHA-1', description: null, availability: 'Loaned' },
      { id: 4, name: 'BRAVO-2', description: null, availability: 'Available' },
      { id: 9, name: 'CHARLIE-3', description: null, availability: 'Available' },
    ]);
    fixture.detectChanges();

    expect(rows().map((row) => row[0])).toEqual(['ALPHA-1', 'BRAVO-2', 'CHARLIE-3']);
  });

  it('shows neither the list nor the empty state when loading fails (REQ-002)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush({ title: 'Server error', status: 500 }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element().querySelector('table')).toBeNull();
    expect(element().textContent).not.toContain('No drones yet.');
    expect(element().textContent).not.toContain('Loading drones...');
  });

  it('shows a created drone in the list as Available (REQ-001)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    fixture.detectChanges();

    type(nameInput(), 'TELLO-07');
    type(descriptionInput(), 'SSID: TELLO-9FA21B');
    submitButton().click();
    fixture.detectChanges();

    http
      .expectOne({ method: 'POST', url: '/api/drones' })
      .flush(
        { id: 7, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
        { status: 201, statusText: 'Created' },
      );
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([
        { id: 7, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
      ]);
    fixture.detectChanges();

    expect(rows()).toEqual([['TELLO-07', 'Available', 'SSID: TELLO-9FA21B']]);
    expect(nameInput().value).toBe('');
    expect(descriptionInput().value).toBe('');
  });

  it('keeps the entered values, shows the duplicate error and adds nothing on a duplicate name (REQ-001)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ id: 2, name: 'TELLO-07', description: null, availability: 'Available' }]);
    fixture.detectChanges();

    type(nameInput(), 'tello-07');
    type(descriptionInput(), 'second unit');
    submitButton().click();
    fixture.detectChanges();

    http
      .expectOne({ method: 'POST', url: '/api/drones' })
      .flush(
        { title: 'A drone with this name already exists.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    // No reload is requested: the list is left as it was.
    http.expectNone({ method: 'GET', url: '/api/drones' });
    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'A drone with this name already exists.',
    ]);
    expect(rows()).toEqual([['TELLO-07', 'Available', '—']]);
    expect(nameInput().value).toBe('tello-07');
    expect(descriptionInput().value).toBe('second unit');
  });
});
