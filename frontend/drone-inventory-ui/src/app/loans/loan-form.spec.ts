import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Drone } from '../drones/drone.models';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import {
  chooseOption,
  chosenOption,
  offeredOptions,
  optionList,
} from '../shared/option-picker/option-picker.testing';
import { ToastService } from '../shared/toast/toast.service';
import { StudentGroup } from '../student-groups/student-group.models';
import { LoanForm } from './loan-form';
import { Loan } from './loan.models';

type PickerId = 'loan-drone' | 'loan-group';

describe('LoanForm (REQ-004, REQ-005, REQ-006)', () => {
  let fixture: ComponentFixture<LoanForm>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const element = () => fixture.nativeElement as HTMLElement;
  const picker = (id: PickerId) => optionList(element(), id);
  const batteriesInput = () => element().querySelector<HTMLInputElement>('#loan-batteries')!;
  const propellersInput = () => element().querySelector<HTMLInputElement>('#loan-propellers')!;
  const submitButton = () => element().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  /** Reference example: TELLO-02 is loaned already, TELLO-07 is available (REQ-005). */
  const loanedDrone: Drone = {
    id: 1,
    name: 'TELLO-02',
    description: null,
    availability: 'Loaned',
    activeLoanId: 1,
  };
  const availableDrone: Drone = {
    id: 2,
    name: 'TELLO-07',
    description: null,
    availability: 'Available',
    activeLoanId: null,
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

  const offered = (id: PickerId) => offeredOptions(fixture, element(), id);
  const chosen = (id: PickerId) => chosenOption(fixture, element(), id);

  /** Chooses the option with this name the way the user does, so that the component's handler runs. */
  async function choose(id: PickerId, name: string): Promise<void> {
    await chooseOption(fixture, element(), id, name);
    fixture.detectChanges();
  }

  /** Types into a search box the way the user does; the offered items stay open for `offeredItems`. */
  async function typeInto(id: PickerId, text: string): Promise<void> {
    const input = element().querySelector<HTMLInputElement>(`input#${id}`)!;
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** The search popup is rendered into an overlay outside the form. */
  const offeredItems = () =>
    Array.from(document.querySelectorAll<HTMLElement>('hlm-combobox-item'))
      .filter((item) => !item.hasAttribute('data-hidden'))
      .map((item) => item.textContent?.trim());

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
  async function chooseReferenceDroneAndGroup(): Promise<void> {
    await choose('loan-drone', 'TELLO-07');
    await choose('loan-group', 'Group 3');
  }

  /** Answers the drone and group lists that the form requests when it is created. */
  function answerLists(drones: Drone[] = [loanedDrone, availableDrone], groups = [group1, group3]) {
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush(drones);
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
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
    expect(picker('loan-drone')).not.toBeNull();
    expect(picker('loan-group')).not.toBeNull();
  });

  it('offers only the Available drones (REQ-005)', async () => {
    answerLists();

    expect(await offered('loan-drone')).toEqual(['TELLO-07']);
    expect(element().textContent).not.toContain('TELLO-02');
  });

  it('shows "No drones available." in place of the drone options when every drone is loaned (REQ-005)', () => {
    answerLists([loanedDrone]);

    expect(picker('loan-drone')).toBeNull();
    expect(element().textContent).toContain('No drones available.');
  });

  it('shows "No drones available." in place of the drone options when there are no drones (REQ-005)', () => {
    answerLists([]);

    expect(picker('loan-drone')).toBeNull();
    expect(element().textContent).toContain('No drones available.');
  });

  it('shows "No student groups yet." in place of the group options (REQ-004)', () => {
    answerLists([availableDrone], []);

    expect(picker('loan-group')).toBeNull();
    expect(element().textContent).toContain('No student groups yet.');
  });

  it('keeps the Loan drone button disabled until a drone and a student group are chosen (REQ-004)', async () => {
    answerLists();
    expect(submitButton().disabled).toBe(true);

    await choose('loan-drone', 'TELLO-07');
    expect(submitButton().disabled).toBe(true);

    await choose('loan-group', 'Group 3');
    expect(submitButton().disabled).toBe(false);
  });

  it('sends the reference example with 4 batteries and 8 propellers and emits the loan (REQ-004, REQ-006)', async () => {
    let emitted: Loan | undefined;
    fixture.componentInstance.loaned.subscribe((loan) => (emitted = loan));
    answerLists();

    await chooseReferenceDroneAndGroup();
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
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned', activeLoanId: 1 }]);
  });

  it('Loan flow still works: one request with drone, group, 2 batteries and 4 propellers (REQ-004, REQ-006)', async () => {
    let emitted: Loan | undefined;
    fixture.componentInstance.loaned.subscribe((loan) => (emitted = loan));
    answerLists();

    await chooseReferenceDroneAndGroup();
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

  const tello08: Drone = {
    id: 3,
    name: 'TELLO-08',
    description: null,
    availability: 'Available',
    activeLoanId: null,
  };

  it('The only drone is shown as an option: name and description without a search box, loaned drones left out (REQ-004, REQ-005)', async () => {
    answerLists([{ ...availableDrone, description: 'right propeller guard damaged' }, loanedDrone]);

    expect(element().querySelector('select')).toBeNull();
    expect(picker('loan-drone')!.getAttribute('data-slot')).toBe('radio-group');
    expect(element().querySelector('input#loan-drone')).toBeNull();
    expect(await offered('loan-drone')).toEqual(['TELLO-07']);
    expect(picker('loan-drone')!.textContent).toContain('right propeller guard damaged');
    expect(element().textContent).not.toContain('TELLO-02');
  });

  it('Search box for two or more options: all available drones are offered when it is opened, loaned drones are not (REQ-004, REQ-005)', async () => {
    answerLists([availableDrone, tello08, loanedDrone]);

    expect(element().querySelector('input#loan-drone')).not.toBeNull();
    expect(element().querySelector('[role="radiogroup"]')).toBeNull();
    expect(await offered('loan-drone')).toEqual(['TELLO-07', 'TELLO-08']);
    expect(await offered('loan-drone')).not.toContain('TELLO-02');
  });

  it('Typing narrows the options without a backend request (REQ-004)', async () => {
    answerLists([
      availableDrone,
      tello08,
      { id: 4, name: 'MAVIC-01', description: null, availability: 'Available', activeLoanId: null },
    ]);

    await typeInto('loan-drone', 'tello');

    expect(offeredItems()).toEqual(['TELLO-07', 'TELLO-08']);
    http.expectNone(() => true);
  });

  it('Changing the search text clears the choice: the loan cannot be submitted meanwhile (REQ-004)', async () => {
    answerLists([availableDrone, tello08], [group1, group3]);
    await choose('loan-drone', 'TELLO-07');
    await choose('loan-group', 'Group 3');
    expect(submitButton().disabled).toBe(false);

    await typeInto('loan-drone', 'TELLO');

    expect(submitButton().disabled).toBe(true);
    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });
  });

  it('No matching option: no group is offered and the form says so (REQ-004)', async () => {
    answerLists([availableDrone], [group1, group3]);

    await typeInto('loan-group', 'xyz');

    expect(offeredItems()).toEqual([]);
    expect(document.querySelector('hlm-combobox-empty')?.textContent?.trim()).toBe(
      'No student group matches.',
    );
  });

  it('Choose a drone and a group by searching: both are shown and sent (REQ-004)', async () => {
    answerLists([availableDrone, tello08], [group1, group3]);

    await choose('loan-drone', 'TELLO-07');
    await choose('loan-group', 'Group 3');
    expect(await chosen('loan-drone')).toBe('TELLO-07');
    expect(await chosen('loan-group')).toBe('Group 3');

    submit();
    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({ droneId: 2, studentGroupId: 3 });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('uses the shared Spartan styles for the card, option list, search box, inputs and button', () => {
    answerLists();

    expect(element().querySelector('section[data-slot="card"]')).not.toBeNull();
    expect(element().querySelector('[data-slot="card-title"]')?.textContent?.trim()).toBe(
      'New loan',
    );
    // One drone is a radio list, two groups are a search box.
    expect(picker('loan-drone')!.getAttribute('data-slot')).toBe('radio-group');
    expect(picker('loan-group')!.getAttribute('data-slot')).toBe('input-group-control');
    expect(batteriesInput().getAttribute('data-slot')).toBe('input');
    expect(propellersInput().getAttribute('data-slot')).toBe('input');
    expect(submitButton().getAttribute('data-slot')).toBe('button');
  });

  it('resets the form and reloads the drone list after a successful loan (REQ-004)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
    type(batteriesInput(), '4');
    type(propellersInput(), '8');
    submit();

    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(createdLoan, {
      status: 201,
      statusText: 'Created',
    });
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned', activeLoanId: 1 }]);
    fixture.detectChanges();

    expect(picker('loan-drone')).toBeNull();
    expect(element().textContent).toContain('No drones available.');
    expect(await chosen('loan-group')).toBeNull();
    expect(batteriesInput().value).toBe('');
    expect(propellersInput().value).toBe('');
    expect(submitButton().disabled).toBe(true);
  });

  it('sends no items when both quantities are empty (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
    submit();

    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({ droneId: 2, studentGroupId: 3 });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('sends only the accessory type that has a quantity (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
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

  it('sends an item with quantity 0 for a typed 0 (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
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

  it('disables Loan drone and sends nothing for a negative quantity (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();

    type(batteriesInput(), '-1');
    expect(submitButton().disabled).toBe(true);
    expect(element().textContent).toContain('whole numbers, 0 or more');

    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });
  });

  it('The loan form shows the limit: 11 batteries or 21 propellers are not submitted (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
    expect(batteriesInput().max).toBe('10');
    expect(propellersInput().max).toBe('20');

    type(batteriesInput(), '11');
    expect(submitButton().disabled).toBe(true);
    expect(element().textContent).toContain('At most 10 batteries');
    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });

    type(batteriesInput(), '10');
    type(propellersInput(), '21');
    expect(element().textContent).not.toContain('At most 10 batteries');
    expect(element().textContent).toContain('At most 20 propellers');
    expect(submitButton().disabled).toBe(true);

    type(propellersInput(), '20');
    expect(submitButton().disabled).toBe(false);
  });

  it('disables Loan drone and sends nothing for a fractional quantity (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();

    type(propellersInput(), '1.5');
    expect(submitButton().disabled).toBe(true);
    expect(element().textContent).toContain('whole numbers, 0 or more');

    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });

    type(propellersInput(), '2');
    expect(submitButton().disabled).toBe(false);
    expect(element().textContent).not.toContain('whole numbers, 0 or more');
  });

  it('keeps the entered values and shows the backend message when the drone was loaned meanwhile (REQ-005)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
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
    expect(await chosen('loan-group')).toBe('Group 3');
    expect(batteriesInput().value).toBe('4');
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([loanedDrone, { ...availableDrone, availability: 'Loaned', activeLoanId: 1 }]);
    fixture.detectChanges();

    expect(picker('loan-drone')).toBeNull();
    expect(element().textContent).toContain('No drones available.');
    expect(submitButton().disabled).toBe(true);
  });

  it('keeps the entered values and shows the backend message for an unknown student group (REQ-004)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
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
    expect(await chosen('loan-drone')).toBe('TELLO-07');
    expect(await chosen('loan-group')).toBe('Group 3');
    expect(batteriesInput().value).toBe('4');
    expect(propellersInput().value).toBe('8');
    expect(submitButton().disabled).toBe(false);
  });

  it('keeps the entered values and shows the backend message for a rejected quantity (REQ-006)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
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
    expect(await chosen('loan-drone')).toBe('TELLO-07');
    expect(await chosen('loan-group')).toBe('Group 3');
    expect(batteriesInput().value).toBe('4');
    // A rejection does not reload the drone list.
    http.expectNone({ method: 'GET', url: '/api/drones' });
  });

  it('disables Loan drone while the request runs so that the loan is sent once (REQ-004)', async () => {
    answerLists();
    await chooseReferenceDroneAndGroup();
    submit();

    expect(submitButton().disabled).toBe(true);
    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    // A second click while the request runs must not send another loan.
    submit();
    http.expectNone({ method: 'POST', url: '/api/loans' });

    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('Only one drone and one group: both are chosen already and the loan can be submitted (REQ-004)', async () => {
    answerLists([loanedDrone, availableDrone], [group3]);

    expect(await chosen('loan-drone')).toBe('TELLO-07');
    expect(await chosen('loan-group')).toBe('Group 3');
    expect(submitButton().disabled).toBe(false);

    submit();
    const req = http.expectOne({ method: 'POST', url: '/api/loans' });
    expect(req.request.body).toEqual({ droneId: 2, studentGroupId: 3 });
    req.flush(createdLoan, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([loanedDrone]);
  });

  it('Several options are not chosen automatically (REQ-004)', async () => {
    answerLists(
      [
        availableDrone,
        {
          id: 3,
          name: 'TELLO-08',
          description: null,
          availability: 'Available',
          activeLoanId: null,
        },
      ],
      [group1, group3],
    );

    expect(await chosen('loan-drone')).toBeNull();
    expect(await chosen('loan-group')).toBeNull();
  });

  it('Single option is chosen again after a loan: the only group stays chosen after the form is cleared (REQ-004)', async () => {
    answerLists([availableDrone, tello08], [group3]);
    expect(await chosen('loan-group')).toBe('Group 3');
    await choose('loan-drone', 'TELLO-07');
    type(batteriesInput(), '2');

    submit();
    http.expectOne({ method: 'POST', url: '/api/loans' }).flush(createdLoan, {
      status: 201,
      statusText: 'Created',
    });
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ ...availableDrone, availability: 'Loaned', activeLoanId: 1 }, tello08]);
    fixture.detectChanges();

    expect(batteriesInput().value).toBe('');
    expect(await chosen('loan-group')).toBe('Group 3');
    // TELLO-08 is now the only available drone, so it is chosen as well.
    expect(await chosen('loan-drone')).toBe('TELLO-08');
  });
});
