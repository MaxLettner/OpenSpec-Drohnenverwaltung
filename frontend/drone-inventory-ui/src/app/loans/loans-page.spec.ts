import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../drones/drone.models';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { StudentGroup } from '../student-groups/student-group.models';
import { ActiveLoanRow, Loan } from './loan.models';
import { LoansPage } from './loans-page';

describe('LoansPage (REQ-007, REQ-008)', () => {
  let fixture: ComponentFixture<LoansPage>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const element = () => fixture.nativeElement as HTMLElement;

  /** The reference example of REQ-007: both loans on 19.08.2026. */
  const group1Loan: ActiveLoanRow = {
    id: 1,
    group: 'Group 1',
    drone: 'TELLO-02',
    batteries: 3,
    propellers: 4,
    loanDate: '2026-08-19',
  };
  const group3Loan: ActiveLoanRow = {
    id: 2,
    group: 'Group 3',
    drone: 'TELLO-07',
    batteries: 4,
    propellers: 8,
    loanDate: '2026-08-19',
  };

  /** Text of the data cells of each row joined by ' | ' (the action cell is left out). */
  const rows = () =>
    Array.from(element().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .slice(0, -1)
        .map((cell) => cell.textContent?.trim())
        .join(' | '),
    );

  const returnButtons = () =>
    Array.from(element().querySelectorAll('tbody button')) as HTMLButtonElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(LoansPage);
  });

  afterEach(() => http.verify());

  /** The loan form on the page requests the drones and student groups when it is created. */
  function answerLoanFormLists(drones: Drone[] = [], groups: StudentGroup[] = []): void {
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush(drones);
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
  }

  /** Renders the page and answers its initial GET /api/loans/active with the given rows. */
  function loadRows(loans: ActiveLoanRow[]): void {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/active' }).flush(loans);
    answerLoanFormLists();
    fixture.detectChanges();
  }

  it('shows the loading state until the active loans have arrived (REQ-007)', () => {
    fixture.detectChanges();
    expect(element().textContent).toContain('Loading active loans...');
    expect(element().querySelector('table')).toBeNull();

    http.expectOne({ method: 'GET', url: '/api/loans/active' }).flush([]);
    answerLoanFormLists();
    fixture.detectChanges();
    expect(element().textContent).not.toContain('Loading active loans...');
  });

  it('embeds the loan form above the active loan list (REQ-004)', () => {
    loadRows([]);

    const form = element().querySelector('app-loan-form');
    const list = element().querySelector('#active-loans-heading');
    expect(form).not.toBeNull();
    expect(form!.compareDocumentPosition(list!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('refreshes the active loan list after the loan form created a loan (REQ-004)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/loans/active' }).flush([group1Loan]);
    answerLoanFormLists(
      [{ id: 2, name: 'TELLO-07', description: null, availability: 'Available' }],
      [{ id: 3, name: 'Group 3' }],
    );
    fixture.detectChanges();

    const select = (id: string) => element().querySelector<HTMLSelectElement>(`#${id}`)!;
    const input = (id: string) => element().querySelector<HTMLInputElement>(`#${id}`)!;
    select('loan-drone').value = '2';
    select('loan-drone').dispatchEvent(new Event('change'));
    select('loan-group').value = '3';
    select('loan-group').dispatchEvent(new Event('change'));
    input('loan-batteries').value = '4';
    input('loan-batteries').dispatchEvent(new Event('input'));
    input('loan-propellers').value = '8';
    input('loan-propellers').dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element().querySelector<HTMLButtonElement>('app-loan-form button[type="submit"]')!.click();
    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(
      {
        id: 2,
        droneId: 2,
        studentGroupId: 3,
        status: 'Active',
        loanDate: '2026-08-19',
        returnDate: null,
        items: [
          { type: 'Battery', quantity: 4 },
          { type: 'Propeller', quantity: 8 },
        ],
      },
      { status: 201, statusText: 'Created' },
    );
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    http.expectOne({ method: 'GET', url: '/api/loans/active' }).flush([group1Loan, group3Loan]);
    fixture.detectChanges();

    expect(rows()).toEqual([
      'Group 1 | TELLO-02 | 3 | 4 | 19.08.2026',
      'Group 3 | TELLO-07 | 4 | 8 | 19.08.2026',
    ]);
  });

  it('renders the reference-example rows with accessories and loan date (REQ-007)', () => {
    loadRows([group1Loan, group3Loan]);

    expect(rows()).toEqual([
      'Group 1 | TELLO-02 | 3 | 4 | 19.08.2026',
      'Group 3 | TELLO-07 | 4 | 8 | 19.08.2026',
    ]);
  });

  it('shows 0 for accessories that the loan does not have (REQ-007)', () => {
    loadRows([{ ...group3Loan, batteries: 0, propellers: 0 }]);

    expect(rows()).toEqual(['Group 3 | TELLO-07 | 0 | 0 | 19.08.2026']);
  });

  it('shows the empty state when no loan is active (REQ-007)', () => {
    loadRows([]);

    expect(element().textContent).toContain('No active loans.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('shows neither the list nor the empty state when loading fails (REQ-007)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/loans/active' })
      .flush({ title: 'Server error', status: 500 }, { status: 500, statusText: 'Server Error' });
    answerLoanFormLists();
    fixture.detectChanges();

    expect(element().querySelector('table')).toBeNull();
    expect(element().textContent).not.toContain('No active loans.');
    expect(element().textContent).not.toContain('Loading active loans...');
  });

  it('calls POST /api/loans/{id}/return and removes the row of the returned loan (REQ-008)', () => {
    loadRows([group1Loan, group3Loan]);

    returnButtons()[0].click();
    const req = http.expectOne({ method: 'POST', url: '/api/loans/1/return' });
    const returned: Loan = {
      id: 1,
      droneId: 2,
      studentGroupId: 1,
      status: 'Returned',
      loanDate: '2026-08-19',
      returnDate: '2026-08-19',
      items: [],
    };
    req.flush(returned);
    fixture.detectChanges();

    expect(rows()).toEqual(['Group 3 | TELLO-07 | 4 | 8 | 19.08.2026']);
  });

  it('disables the return button of a row while its return request runs (REQ-008)', () => {
    loadRows([group1Loan, group3Loan]);

    returnButtons()[0].click();
    fixture.detectChanges();

    expect(returnButtons().map((button) => button.disabled)).toEqual([true, false]);

    http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush({
      id: 1,
      droneId: 2,
      studentGroupId: 1,
      status: 'Returned',
      loanDate: '2026-08-19',
      returnDate: '2026-08-19',
      items: [],
    });
    fixture.detectChanges();

    expect(rows()).toEqual(['Group 3 | TELLO-07 | 4 | 8 | 19.08.2026']);
  });

  it('keeps the row and shows the backend message when the return is rejected with 409 (REQ-008)', () => {
    loadRows([group1Loan, group3Loan]);

    returnButtons()[0].click();
    http.expectOne({ method: 'POST', url: '/api/loans/1/return' }).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.10',
        title: 'Conflict',
        status: 409,
        detail: 'The loan has already been returned.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(rows()).toEqual([
      'Group 1 | TELLO-02 | 3 | 4 | 19.08.2026',
      'Group 3 | TELLO-07 | 4 | 8 | 19.08.2026',
    ]);
    expect(returnButtons().map((button) => button.disabled)).toEqual([false, false]);
    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'The loan has already been returned.',
    ]);
  });
});
