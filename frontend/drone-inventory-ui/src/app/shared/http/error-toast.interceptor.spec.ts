import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DroneService } from '../../drones/drone.service';
import { LoanService } from '../../loans/loan.service';
import { ToastService } from '../toast/toast.service';
import { GENERIC_ERROR_MESSAGE, errorToastInterceptor } from './error-toast.interceptor';

describe('errorToastInterceptor (REQ-001, REQ-004, REQ-005, REQ-008)', () => {
  let drones: DroneService;
  let loans: LoanService;
  let http: HttpTestingController;
  let toasts: ToastService;

  const messages = () => toasts.toasts().map((toast) => toast.message);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    drones = TestBed.inject(DroneService);
    loans = TestBed.inject(LoanService);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  it('shows the detail and the field messages of a 400 ProblemDetails (blank name)', () => {
    drones.create({ name: '' }).subscribe({ error: () => undefined });

    http.expectOne({ method: 'POST', url: '/api/drones' }).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { name: ['The name must not be blank.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(messages()).toEqual([
      'One or more validation errors occurred. The name must not be blank.',
    ]);
  });

  it('shows the detail of a 404 ProblemDetails (unknown loan)', () => {
    loans.get(42).subscribe({ error: () => undefined });

    http.expectOne({ method: 'GET', url: '/api/loans/42' }).flush(
      {
        title: 'Not Found',
        status: 404,
        detail: 'Loan 42 does not exist.',
      },
      { status: 404, statusText: 'Not Found' },
    );

    expect(messages()).toEqual(['Loan 42 does not exist.']);
  });

  it('shows the detail of a 409 ProblemDetails (drone not available)', () => {
    loans.return(5).subscribe({ error: () => undefined });

    http.expectOne({ method: 'POST', url: '/api/loans/5/return' }).flush(
      {
        title: 'Conflict',
        status: 409,
        detail: 'Loan 5 has already been returned.',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(messages()).toEqual(['Loan 5 has already been returned.']);
  });

  it('shows the title of a 409 ProblemDetails without a detail (duplicate name)', () => {
    drones.create({ name: 'TELLO-07' }).subscribe({ error: () => undefined });

    http
      .expectOne({ method: 'POST', url: '/api/drones' })
      .flush(
        { title: 'A drone with this name already exists.', status: 409 },
        { status: 409, statusText: 'Conflict' },
      );

    expect(messages()).toEqual(['A drone with this name already exists.']);
  });

  it('shows a generic message when the server cannot be reached (status 0)', () => {
    loans.listActive().subscribe({ error: () => undefined });

    http.expectOne({ method: 'GET', url: '/api/loans/active' }).error(new ProgressEvent('error'));

    expect(messages()).toEqual([GENERIC_ERROR_MESSAGE]);
  });

  it('shows a generic message for a non-JSON error response', () => {
    loans.listHistory().subscribe({ error: () => undefined });

    http
      .expectOne({ method: 'GET', url: '/api/loans/history' })
      .flush('<html>Internal error</html>', { status: 500, statusText: 'Server Error' });

    expect(messages()).toEqual([GENERIC_ERROR_MESSAGE]);
  });

  it('rethrows the error so that the calling component can react to it', () => {
    let thrown: unknown;
    loans.get(42).subscribe({ error: (error: unknown) => (thrown = error) });

    http
      .expectOne({ method: 'GET', url: '/api/loans/42' })
      .flush(
        { status: 404, detail: 'Loan 42 does not exist.' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(thrown).toBeInstanceOf(HttpErrorResponse);
    expect((thrown as HttpErrorResponse).status).toBe(404);
  });

  it('shows nothing for a successful response', () => {
    let loaded = false;
    loans.get(5).subscribe(() => (loaded = true));

    http.expectOne({ method: 'GET', url: '/api/loans/5' }).flush({
      id: 5,
      droneId: 7,
      studentGroupId: 3,
      status: 'Active',
      loanDate: '2026-08-19',
      returnDate: null,
      items: [],
    });

    expect(loaded).toBe(true);
    expect(messages()).toEqual([]);
  });
});
