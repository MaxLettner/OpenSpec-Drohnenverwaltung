import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActiveLoanRow, Loan, LoanHistoryRow } from './loan.models';
import { LoanService } from './loan.service';

describe('LoanService (REQ-004 to REQ-010)', () => {
  let service: LoanService;
  let http: HttpTestingController;

  const activeLoan: Loan = {
    id: 5,
    droneId: 7,
    studentGroupId: 3,
    status: 'Active',
    loanDate: '2026-08-19',
    returnDate: null,
    items: [
      { type: 'Battery', quantity: 4 },
      { type: 'Propeller', quantity: 8 },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoanService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a loan with POST /api/loans and the accessories as body (REQ-004, REQ-006)', () => {
    let result: Loan | undefined;
    service
      .create({
        droneId: 7,
        studentGroupId: 3,
        items: [
          { type: 'Battery', quantity: 4 },
          { type: 'Propeller', quantity: 8 },
        ],
      })
      .subscribe((loan) => (result = loan));

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({
      droneId: 7,
      studentGroupId: 3,
      items: [
        { type: 'Battery', quantity: 4 },
        { type: 'Propeller', quantity: 8 },
      ],
    });
    req.flush(activeLoan, { status: 201, statusText: 'Created' });

    expect(result).toEqual(activeLoan);
  });

  it('creates a loan without accessories when items are omitted (REQ-006)', () => {
    service.create({ droneId: 7, studentGroupId: 3 }).subscribe();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({ droneId: 7, studentGroupId: 3 });
    req.flush({ ...activeLoan, items: [] }, { status: 201, statusText: 'Created' });
  });

  it('gets one loan with GET /api/loans/{id} (REQ-004)', () => {
    let result: Loan | undefined;
    service.get(5).subscribe((loan) => (result = loan));

    const req = http.expectOne({ method: 'GET', url: '/api/loans/5' });
    expect(req.request.body).toBeNull();
    req.flush(activeLoan);

    expect(result).toEqual(activeLoan);
  });

  it('returns a loan with POST /api/loans/{id}/return (REQ-008, REQ-009)', () => {
    let result: Loan | undefined;
    service.return(5).subscribe((loan) => (result = loan));

    const req = http.expectOne({ method: 'POST', url: '/api/loans/5/return' });
    expect(req.request.body).toBeNull();
    const returned: Loan = { ...activeLoan, status: 'Returned', returnDate: '2026-08-20' };
    req.flush(returned);

    expect(result).toEqual(returned);
  });

  it('lists active loan rows with GET /api/loans/active (REQ-007)', () => {
    let result: ActiveLoanRow[] | undefined;
    service.listActive().subscribe((rows) => (result = rows));

    const req = http.expectOne({ method: 'GET', url: '/api/loans/active' });
    expect(req.request.body).toBeNull();
    const rows: ActiveLoanRow[] = [
      {
        id: 5,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 4,
        propellers: 8,
        loanDate: '2026-08-19',
      },
    ];
    req.flush(rows);

    expect(result).toEqual(rows);
  });

  it('lists history rows with GET /api/loans/history (REQ-010)', () => {
    let result: LoanHistoryRow[] | undefined;
    service.listHistory().subscribe((rows) => (result = rows));

    const req = http.expectOne({ method: 'GET', url: '/api/loans/history' });
    expect(req.request.body).toBeNull();
    const rows: LoanHistoryRow[] = [
      {
        id: 5,
        group: 'Group 3',
        drone: 'TELLO-07',
        batteries: 4,
        propellers: 8,
        loanDate: '2026-08-19',
        returnDate: '2026-08-20',
      },
    ];
    req.flush(rows);

    expect(result).toEqual(rows);
  });
});
