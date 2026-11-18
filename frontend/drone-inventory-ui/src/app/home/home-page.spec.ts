import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { Dashboard } from './dashboard.models';
import { HomePage } from './home-page';

const weeks = (counts: number[]) =>
  counts.map((count, n) => ({
    weekStart: new Date(Date.UTC(2026, 0, 19 + 7 * n)).toISOString().slice(0, 10),
    count,
  }));

const sample: Dashboard = {
  drones: { total: 3, available: 2, loaned: 1 },
  studentGroups: 2,
  loans: { active: 1, returned: 1 },
  accessoriesOut: { batteries: 5, propellers: 4 },
  longestActiveLoans: [
    { id: 41, group: 'Group 1', drone: 'TELLO-02', loanDate: '2026-03-01', daysOut: 14 },
  ],
  loansPerWeek: weeks([0, 0, 0, 0, 0, 0, 1, 2]),
};

const empty: Dashboard = {
  drones: { total: 0, available: 0, loaned: 0 },
  studentGroups: 0,
  loans: { active: 0, returned: 0 },
  accessoriesOut: { batteries: 0, propellers: 0 },
  longestActiveLoans: [],
  loansPerWeek: weeks([0, 0, 0, 0, 0, 0, 0, 0]),
};

/** dashboard spec (REQ-002, REQ-006, REQ-007, REQ-008, REQ-010). */
describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let http: HttpTestingController;

  const element = () => fixture.nativeElement as HTMLElement;
  const stat = (key: string) =>
    element().querySelector(`[data-stat="${key}"]`)!.textContent!.trim();
  const rows = () =>
    Array.from(element().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent!.trim()),
    );

  function show(dashboard: Dashboard): void {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/dashboard' }).flush(dashboard);
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
    fixture = TestBed.createComponent(HomePage);
  });

  afterEach(() => http.verify());

  it('Figures match the data', () => {
    show(sample);

    expect(stat('drones')).toBe('3');
    expect(stat('available')).toBe('2');
    expect(stat('loaned')).toBe('1');
    expect(stat('studentGroups')).toBe('2');
    expect(stat('activeLoans')).toBe('1');
    expect(stat('returnedLoans')).toBe('1');
    expect(element().querySelector('svg[role="img"]')!.getAttribute('aria-label')).toBe(
      '2 of 3 drones available, 1 loaned',
    );
  });

  it('Empty database: every figure is 0 and no error is shown', () => {
    show(empty);

    for (const key of [
      'drones',
      'available',
      'loaned',
      'studentGroups',
      'activeLoans',
      'returnedLoans',
      'batteries',
      'propellers',
    ]) {
      expect(stat(key)).toBe('0');
    }
    expect(element().textContent).toContain('No active loans.');
    expect(element().textContent).not.toContain('could not be loaded');
  });

  it('Only active loans count: shows the accessories out from the backend', () => {
    show(sample);

    expect(stat('batteries')).toBe('5');
    expect(stat('propellers')).toBe('4');
  });

  it('Oldest loans first: lists the rows in the backend order with their days out', () => {
    show({
      ...sample,
      longestActiveLoans: [
        { id: 1, group: 'G1', drone: 'D1', loanDate: '2026-03-01', daysOut: 14 },
        { id: 2, group: 'G2', drone: 'D2', loanDate: '2026-03-02', daysOut: 13 },
      ],
    });

    expect(rows()).toEqual([
      ['G1', 'D1', '01.03.2026', '14', 'Return'],
      ['G2', 'D2', '02.03.2026', '13', 'Return'],
    ]);
  });

  it('Return from the Home page: returns the loan and loads the figures again', () => {
    show(sample);

    element().querySelector<HTMLButtonElement>('button[aria-label="Return TELLO-02"]')!.click();
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: '/api/loans/41/return' }).flush({});
    http.expectOne({ method: 'GET', url: '/api/dashboard' }).flush({
      ...sample,
      drones: { total: 3, available: 3, loaned: 0 },
      loans: { active: 0, returned: 2 },
      longestActiveLoans: [],
    });
    fixture.detectChanges();

    expect(stat('activeLoans')).toBe('0');
    expect(stat('returnedLoans')).toBe('2');
    expect(rows()).toEqual([]);
  });

  it('Loans counted by week: 8 weeks, the current one last, with the counts as text', () => {
    show(sample);

    const bars = Array.from(element().querySelectorAll('[data-week]'));
    expect(bars.map((bar) => bar.getAttribute('data-week'))).toEqual(
      sample.loansPerWeek.map((w) => w.weekStart),
    );
    expect(bars[0].getAttribute('aria-label')).toBe('Week of 19.01.2026: 0 loans');
    expect(bars[7].getAttribute('aria-label')).toBe('Week of 09.03.2026: 2 loans');
    expect(bars[6].getAttribute('aria-label')).toBe('Week of 02.03.2026: 1 loan');
  });
});
