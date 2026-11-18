import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoanHistoryPage } from './loan-history-page';

describe('LoanHistoryPage (REQ-010)', () => {
  let fixture: ComponentFixture<LoanHistoryPage>;
  let http: HttpTestingController;

  const element = () => fixture.nativeElement as HTMLElement;

  /** Text of the column headers of the history table. */
  const headers = () =>
    Array.from(element().querySelectorAll('thead th')).map((cell) => cell.textContent?.trim());

  /** Text of every table row as the cells of group, drone, accessories and both dates. */
  const rows = () =>
    Array.from(element().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoanHistoryPage);
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('Details of a retired drone and of a retired group: "Retired" and no Loan action (REQ-010)', async () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([
      {
        id: 6,
        group: 'Group 9',
        drone: 'TELLO-05',
        batteries: 0,
        propellers: 0,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
        studentGroupId: 9,
        droneId: 5,
      },
    ]);
    fixture.detectChanges();
    const nameButton = (label: string) =>
      element().querySelector<HTMLButtonElement>(`button[aria-label="Details of ${label}"]`)!;

    nameButton('TELLO-05').click();
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones/5' }).flush({
      id: 5,
      name: 'TELLO-05',
      description: null,
      availability: 'Available',
      retired: true,
      activeLoan: null,
      recentLoans: [],
    });
    fixture.detectChanges();
    const droneDialog = document.querySelector<HTMLElement>('app-drone-details-dialog')!;
    expect(droneDialog.textContent).toContain('TELLO-05');
    expect(droneDialog.textContent).toContain('Retired');
    expect(droneDialog.textContent).not.toContain('Available');
    const actions = Array.from(droneDialog.querySelectorAll('a, button')).map((b) =>
      b.textContent!.trim(),
    );
    expect(actions).not.toContain('Loan');

    droneDialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    nameButton('Group 9').click();
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/student-groups/9' })
      .flush({ id: 9, name: 'Group 9', retired: true, activeLoans: [], recentLoans: [] });
    fixture.detectChanges();
    const groupDialog = document.querySelector('app-student-group-details-dialog')!;
    expect(groupDialog.textContent).toContain('Group 9');
    expect(groupDialog.textContent).toContain('Retired');
  });

  it('Open details from the history: the group dialog first, then the drone dialog (REQ-010)', async () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([
      {
        id: 5,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 4,
        propellers: 8,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
        studentGroupId: 3,
        droneId: 7,
      },
    ]);
    fixture.detectChanges();
    const nameButton = (label: string) =>
      element().querySelector<HTMLButtonElement>(`button[aria-label="Details of ${label}"]`)!;

    nameButton('Group 3').click();
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/student-groups/3' })
      .flush({ id: 3, name: 'Group 3', activeLoans: [], recentLoans: [] });
    fixture.detectChanges();
    const groupDialog = document.querySelector('app-student-group-details-dialog')!;
    expect(groupDialog.textContent).toContain('Group 3');

    groupDialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('app-student-group-details-dialog')).toBeNull();

    nameButton('TELLO-07').click();
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones/7' }).flush({
      id: 7,
      name: 'TELLO-07',
      description: null,
      availability: 'Available',
      activeLoan: null,
      recentLoans: [],
    });
    fixture.detectChanges();
    expect(document.querySelector('app-drone-details-dialog')!.textContent).toContain('TELLO-07');
  });

  it('shows the loading state until the history has arrived (REQ-010)', () => {
    fixture.detectChanges();
    expect(element().textContent).toContain('Loading loan history...');
    expect(element().querySelector('table')).toBeNull();

    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([]);
    fixture.detectChanges();
    expect(element().textContent).not.toContain('Loading loan history...');
  });

  it('renders a returned loan with group, drone, accessories and both dates as dd.MM.yyyy (REQ-010)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([
      {
        id: 5,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 4,
        propellers: 8,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
      },
    ]);
    fixture.detectChanges();

    expect(headers()).toEqual([
      'Group',
      'Drone',
      'Batteries',
      'Propellers',
      'Loan Date',
      'Return Date',
    ]);
    expect(rows()).toEqual([['Group 3', 'TELLO-07', '4', '8', '19.08.2026', '20.08.2026']]);
  });

  it('uses the shared table style inside a scrollable container on narrow viewports (ui-theme)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([
      {
        id: 5,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 4,
        propellers: 8,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
      },
    ]);
    fixture.detectChanges();

    const container = element().querySelector<HTMLElement>(
      '[data-slot="card"] div[data-slot="table-container"]',
    )!;
    expect(container.querySelector('table[data-slot="table"]')).not.toBeNull();
    expect(
      container.querySelector('thead[data-slot="table-header"] th[data-slot="table-head"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('tbody[data-slot="table-body"] td[data-slot="table-cell"]'),
    ).not.toBeNull();
    expect(container.classList.contains('overflow-x-auto')).toBe(true);

    // The page root has no fixed width, so the table container scrolls instead of the page.
    expect(element().className).toContain('block');
    expect(element().className).not.toMatch(/\b(w-\d|w-\[|min-w-|max-w-)/);
    expect(element().style.width).toBe('');
  });

  it('shows the empty state when no loan has been returned yet (REQ-010)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([]);
    fixture.detectChanges();

    expect(element().textContent).toContain('No returned loans yet.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('keeps the order in which the backend delivers the rows (REQ-010)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/history' }).flush([
      {
        id: 9,
        group: 'Group 1',
        drone: 'TELLO-02',
        batteries: 3,
        propellers: 4,
        loanDate: '2026-08-10',
        returnDate: '2026-08-25',
      },
      {
        id: 4,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 0,
        propellers: 0,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
      },
      {
        id: 6,
        group: 'Group 2',
        drone: 'TELLO-08',
        batteries: 1,
        propellers: 2,
        loanDate: '2026-08-01',
        returnDate: '2026-08-05',
      },
    ]);
    fixture.detectChanges();

    expect(rows().map((row) => row[0])).toEqual(['Group 1', 'Group 3', 'Group 2']);
  });

  it('shows neither the table nor the empty state when loading fails (REQ-010)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/loans/history' })
      .flush({ title: 'Server error', status: 500 }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element().querySelector('table')).toBeNull();
    expect(element().textContent).not.toContain('No returned loans yet.');
    expect(element().textContent).not.toContain('Loading loan history...');
  });
});
