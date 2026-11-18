import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { Drone, DroneDetails } from './drone.models';
import { DronesPage } from './drones-page';

/** drone spec: Show drone details (REQ-002, REQ-007, REQ-008, REQ-010). */
describe('Drone details dialog', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;

  const loanedDrone: Drone = {
    id: 2,
    name: 'TELLO-02',
    description: 'SSID: TELLO-1A2B3C',
    availability: 'Loaned',
    activeLoanId: 41,
  };
  const availableDrone: Drone = {
    id: 7,
    name: 'TELLO-07',
    description: null,
    availability: 'Available',
    activeLoanId: null,
  };
  const loanedDetails: DroneDetails = {
    id: 2,
    name: 'TELLO-02',
    description: 'SSID: TELLO-1A2B3C',
    availability: 'Loaned',
    retired: false,
    activeLoan: {
      id: 41,
      group: 'Group 1',
      loanDate: '2026-03-10',
      daysOut: 5,
      batteries: 2,
      propellers: 4,
    },
    recentLoans: [],
  };
  const recent = (n: number) => ({
    id: 100 - n,
    group: `Group ${n}`,
    loanDate: `2026-03-0${n}`,
    returnDate: `2026-03-0${n + 1}`,
    batteries: 0,
    propellers: 0,
  });

  const dialog = () => document.querySelector<HTMLElement>('app-drone-details-dialog');
  const field = (name: string) =>
    dialog()!.querySelector(`[data-field="${name}"]`)!.textContent!.trim();
  const button = (text: string) =>
    Array.from(dialog()!.querySelectorAll<HTMLElement>('button, a')).find(
      (b) => b.textContent?.trim() === text,
    );
  const nameButton = (name: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      `button[aria-label="Details of ${name}"]`,
    )!;

  function open(name: string, details: DroneDetails): void {
    nameButton(name).focus();
    nameButton(name).click();
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: `/api/drones/${details.id}` }).flush(details);
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
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone, availableDrone]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('Details of a loaned drone', () => {
    open('TELLO-02', loanedDetails);

    expect(dialog()!.textContent).toContain('TELLO-02');
    expect(dialog()!.textContent).toContain('Loaned');
    expect(field('group')).toBe('Group 1');
    expect(field('loanDate')).toBe('10.03.2026');
    expect(field('daysOut')).toBe('5 days');
    expect(field('batteries')).toBe('2');
    expect(field('propellers')).toBe('4');
    expect(button('Return')).toBeDefined();
    expect(button('Loan')).toBeUndefined();
  });

  it('Details of an available drone', () => {
    open('TELLO-07', {
      id: 7,
      name: 'TELLO-07',
      description: null,
      availability: 'Available',
      retired: false,
      activeLoan: null,
      recentLoans: [5, 4, 3, 2, 1].map(recent),
    });

    expect(dialog()!.textContent).toContain('Available');
    expect(button('Loan')!.getAttribute('href')).toBe('/loans?droneId=7');
    expect(button('Return')).toBeUndefined();
    const items = Array.from(dialog()!.querySelectorAll('li')).map((li) =>
      Array.from(li.querySelectorAll('span'))
        .map((span) => span.textContent!.trim())
        .join(' | '),
    );
    expect(items).toEqual([
      'Group 5 | 05.03.2026 to 06.03.2026',
      'Group 4 | 04.03.2026 to 05.03.2026',
      'Group 3 | 03.03.2026 to 04.03.2026',
      'Group 2 | 02.03.2026 to 03.03.2026',
      'Group 1 | 01.03.2026 to 02.03.2026',
    ]);
  });

  it('Return from the dialog', () => {
    open('TELLO-02', loanedDetails);

    (button('Return') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: '/api/loans/41/return' }).flush({});
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ ...loanedDrone, availability: 'Available', activeLoanId: null }, availableDrone]);
    http
      .expectOne({ method: 'GET', url: '/api/drones/2' })
      .flush({ ...loanedDetails, availability: 'Available', activeLoan: null });
    fixture.detectChanges();

    expect(dialog()!.textContent).toContain('Available');
    expect(button('Return')).toBeUndefined();
    const row = (fixture.nativeElement as HTMLElement).querySelector('tbody tr')!;
    expect(row.textContent).toContain('Available');
  });

  it('Close with Escape', async () => {
    open('TELLO-02', loanedDetails);

    dialog()!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(nameButton('TELLO-02'));
  });
});
