import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { Drone } from './drone.models';
import { DronesPage } from './drones-page';

/** drone spec: Retire a drone (REQ-001, REQ-010). */
describe('Retire a drone', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const available: Drone = {
    id: 5,
    name: 'TELLO-05',
    description: null,
    availability: 'Available',
    activeLoanId: null,
  };
  const loaned: Drone = {
    id: 2,
    name: 'TELLO-02',
    description: null,
    availability: 'Loaned',
    activeLoanId: 41,
  };

  const dialog = () => document.querySelector<HTMLElement>('app-retire-dialog');
  const dialogButton = (text: string) =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
  const pageButton = (name: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      `button[aria-label="Retire ${name}"]`,
    )!;

  function openRetire(name: string): void {
    pageButton(name).click();
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
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(DronesPage);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loaned, available]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('asks for confirmation with the name and the consequences', () => {
    openRetire('TELLO-05');

    expect(dialog()!.getAttribute('data-slot')).toBe('card');
    expect(dialog()!.textContent!.replace(/\s+/g, ' ')).toContain(
      'Retire TELLO-05? It disappears from the lists and the loan form, the history keeps it.',
    );
  });

  it('Retire an available drone: confirming retires it and reloads the list', () => {
    openRetire('TELLO-05');

    dialogButton('Retire').click();
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: '/api/drones/5/retire' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loaned]);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('TELLO-05');
  });

  it('Loaned drone cannot be retired: the error toast shows and the drone stays', () => {
    openRetire('TELLO-02');

    dialogButton('Retire').click();
    fixture.detectChanges();
    http
      .expectOne({ method: 'POST', url: '/api/drones/2/retire' })
      .flush(
        { status: 409, detail: 'Drone 2 has an active loan and cannot be retired.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'Drone 2 has an active loan and cannot be retired.',
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TELLO-02');
  });

  it('Cancel the retirement: nothing is requested and the drone stays', () => {
    openRetire('TELLO-05');

    dialogButton('Cancel').click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('TELLO-05');
  });
});
