import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoanHistoryPage);
  });

  afterEach(() => http.verify());

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
