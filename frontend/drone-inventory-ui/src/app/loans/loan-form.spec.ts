import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../drones/drone.models';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { StudentGroup } from '../student-groups/student-group.models';
import { LoanForm } from './loan-form';
import { Loan } from './loan.models';

describe('LoanForm (REQ-004, REQ-005, REQ-006)', () => {
  let fixture: ComponentFixture<LoanForm>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const element = () => fixture.nativeElement as HTMLElement;
  const droneSelect = () => element().querySelector<HTMLSelectElement>('#loan-drone');
  const groupSelect = () => element().querySelector<HTMLSelectElement>('#loan-group');
  const batteriesInput = () => element().querySelector<HTMLInputElement>('#loan-batteries')!;
  const propellersInput = () => element().querySelector<HTMLInputElement>('#loan-propellers')!;
  const submitButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  /** Reference example: TELLO-02 is loaned already, TELLO-07 is available (REQ-005). */
  const loanedDrone: Drone = {
    id: 1,
    name: 'TELLO-02',
    description: null,
    availability: 'Loaned',
  };
  const availableDrone: Drone = {
    id: 2,
    name: 'TELLO-07',
    description: null,
    availability: 'Available',
  };
  const group1: StudentGroup = { id: 1, name: 'Group 1' };
  const group3: StudentGroup = { id: 3, name: 'Group 3' };

  const createdLoan: Loan = {
    id: 5,
    droneId: 2,
    studentGroupId: 3,
    status: 'Active',
    loanDate: '2026-08-19',
    returnDate: null,
    items: [
      { type: 'Battery', quantity: 4 },
      { type: 'Propeller', quantity: 8 },
    ],
  };

  /** Chooses an option of a select the way the user does, so that the component's handler runs. */
  function choose(select: HTMLSelectElement, value: string): void {
    select.value = value;
    // A real change event bubbles from the inner <select> to the <hlm-native-select> host.
    select.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  /** Types into a number input the way the user does, so that the component's handler runs. */
  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    submitButton().click();
    fixture.detectChanges();
  }

  /** Chooses TELLO-07 for Group 3, the reference example. */
  function chooseReferenceDroneAndGroup(): void {
    choose(droneSelect()!, '2');
    choose(groupSelect()!, '3');
  }

  /** Answers the drone and group lists that the form requests when it is created. */
  function answerLists(drones: Drone[] = [loanedDrone, availableDrone], groups = [group1, group3]) {
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush(drones);
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
    fixture.detectChanges();
  }

  /** Text of the options of the drone select, placeholder included. */
  const droneOptions = () =>
    Array.from(droneSelect()?.options ?? []).map((option) => option.textContent?.trim());

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(LoanForm);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('shows the loading state until the drones and student groups have arrived (REQ-004)', () => {
    expect(element().textContent).toContain('Loading drones...');
    expect(element().textContent).toContain('Loading student groups...');

    answerLists();

    expect(element().textContent).not.toContain('Loading drones...');
    expect(element().textContent).not.toContain('Loading student groups...');
    expect(droneSelect()).not.toBeNull();
    expect(groupSelect()).not.toBeNull();
  });

  it('offers only the Available drones in the drone select (REQ-005)', () => {
    answerLists();

    expect(droneOptions()).toEqual(['Choose a drone', 'TELLO-07']);
    expect(element().textContent).not.toContain('TELLO-02');
  });

  it('shows "No drones available." in place of the drone select when every drone is loaned (REQ-005)', () => {
    answerLists([loanedDrone]);

    expect(droneSelect()).toBeNull();
    expect(element().textContent).toContain('No drones available.');
  });

  it('shows "No drones available." in place of the drone select when there are no drones (REQ-005)', () => {
    answerLists([]);

    expect(droneSelect()).toBeNull();
    expect(element().textContent).toContain('No drones available.');
  });

  it('shows "No student groups yet." in place of the group select (REQ-004)', () => {
    answerLists([availableDrone], []);

    expect(groupSelect()).toBeNull();
    expect(element().textContent).toContain('No student groups yet.');
  });

  it('keeps the Loan drone button disabled until a drone and a student group are chosen (REQ-004)', () => {
    answerLists();
    expect(submitButton().disabled).toBe(true);

    choose(droneSelect()!, '2');
    expect(submitButton().disabled).toBe(true);

    choose(groupSelect()!, '3');
    expect(submitButton().disabled).toBe(false);

    choose(droneSelect()!, '');
    expect(submitButton().disabled).toBe(true);
  });

  it('sends the reference example with 4 batteries and 8 propellers and emits the loan (REQ-004, REQ-006)', () => {
    let emitted: Loan | undefined;
    fixture.componentInstance.loaned.subscribe((loan) => (emitted = loan));
    answerLists();

    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    type(propellersInput(), '8');
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({
      droneId: 2,
      studentGroupId: 3,
      items: [
        { type: 'Battery', quantity: 4 },
        { type: 'Propeller', quantity: 8 },
      ],
    });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(emitted).toEqual(createdLoan);
    // The drone list is reloaded; TELLO-07 is loaned now and must not be offered any more.
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned' }]);
  });

  it('Loan flow still works: one request with drone, group, 2 batteries and 4 propellers (REQ-004, REQ-006)', () => {
    let emitted: Loan | undefined;
    fixture.componentInstance.loaned.subscribe((loan) => (emitted = loan));
    answerLists();

    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '2');
    type(propellersInput(), '4');
    submit();

    const requests = http.match({ method: 'POST', url: '/api/loans' });
    expect(requests.length).toBe(1);
    expect(requests[0].request.body).toEqual({
      droneId: 2,
      studentGroupId: 3,
      items: [
        { type: 'Battery', quantity: 2 },
        { type: 'Propeller', quantity: 4 },
      ],
    });
    requests[0].flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);

    expect(emitted).toEqual(createdLoan);
  });

  it('uses the shared Spartan styles for the card, selects, inputs and button', () => {
    answerLists();

    expect(element().querySelector('section[data-slot="card"]')).not.toBeNull();
    expect(element().querySelector('[data-slot="card-title"]')?.textContent?.trim()).toBe(
      'New loan',
    );
    expect(droneSelect()!.getAttribute('data-slot')).toBe('native-select');
    expect(groupSelect()!.getAttribute('data-slot')).toBe('native-select');
    expect(batteriesInput().getAttribute('data-slot')).toBe('input');
    expect(propellersInput().getAttribute('data-slot')).toBe('input');
    expect(submitButton().getAttribute('data-slot')).toBe('button');
  });

  it('resets the form and reloads the drone list after a successful loan (REQ-004)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    type(propellersInput(), '8');
    submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(createdLoan, {
      status: 201,
      statusText: 'Created',
    });
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned' }]);
    fixture.detectChanges();

    expect(droneSelect()).toBeNull();
    expect(element().textContent).toContain('No drones available.');
    expect(groupSelect()!.value).toBe('');
    expect(batteriesInput().value).toBe('');
    expect(propellersInput().value).toBe('');
    expect(submitButton().disabled).toBe(true);
  });

  it('sends no items when both quantities are empty (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({ droneId: 2, studentGroupId: 3 });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('sends only the accessory type that has a quantity (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({
      droneId: 2,
      studentGroupId: 3,
      items: [{ type: 'Battery', quantity: 4 }],
    });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('sends an item with quantity 0 for a typed 0 (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '0');
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({
      droneId: 2,
      studentGroupId: 3,
      items: [{ type: 'Battery', quantity: 0 }],
    });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('disables Loan drone and sends nothing for a negative quantity (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();

    type(batteriesInput(), '-1');
    expect(submitButton().disabled).toBe(true);
    expect(element().textContent).toContain('whole numbers, 0 or more');

    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });
  });

  it('disables Loan drone and sends nothing for a fractional quantity (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();

    type(propellersInput(), '1.5');
    expect(submitButton().disabled).toBe(true);
    expect(element().textContent).toContain('whole numbers, 0 or more');

    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });

    type(propellersInput(), '2');
    expect(submitButton().disabled).toBe(false);
    expect(element().textContent).not.toContain('whole numbers, 0 or more');
  });

  it('keeps the entered values and shows the backend message when the drone was loaned meanwhile (REQ-005)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(
      {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.10',
        title: 'Conflict',
        status: 409,
        detail: 'The drone is not available.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(toasts.toasts().map((toast) => toast.message)).toEqual(['The drone is not available.']);
    // The group and the quantities stay; the drone list is reloaded and TELLO-07 disappears.
    expect(groupSelect()!.value).toBe('3');
    expect(batteriesInput().value).toBe('4');
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned' }]);
    fixture.detectChanges();

    expect(droneSelect()).toBeNull();
    expect(element().textContent).toContain('No drones available.');
    expect(submitButton().disabled).toBe(true);
  });

  it('keeps the entered values and shows the backend message for an unknown student group (REQ-004)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    type(propellersInput(), '8');
    submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(
      {
        title: 'Not Found',
        status: 404,
        detail: 'The student group does not exist.',
      },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();

    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'The student group does not exist.',
    ]);
    expect(droneSelect()!.value).toBe('2');
    expect(groupSelect()!.value).toBe('3');
    expect(batteriesInput().value).toBe('4');
    expect(propellersInput().value).toBe('8');
    expect(submitButton().disabled).toBe(false);
  });

  it('keeps the entered values and shows the backend message for a rejected quantity (REQ-006)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: { 'items[0].quantity': ['Quantity must be a whole number of 0 or more.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'One or more validation errors occurred. Quantity must be a whole number of 0 or more.',
    ]);
    expect(droneSelect()!.value).toBe('2');
    expect(groupSelect()!.value).toBe('3');
    expect(batteriesInput().value).toBe('4');
    // A rejection does not reload the drone list.
    http.expectNone({ method: 'GET', url: '/api/drones' });
  });

  it('disables Loan drone while the request runs so that the loan is sent once (REQ-004)', () => {
    answerLists();
    chooseReferenceDroneAndGroup();
    submit();

    expect(submitButton().disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    // A second click while the request runs must not send another loan.
    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });

    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });
});
