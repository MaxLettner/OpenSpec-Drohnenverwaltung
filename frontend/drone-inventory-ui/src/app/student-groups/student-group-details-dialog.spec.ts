import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { StudentGroupDetails } from './student-group.models';
import { StudentGroupsPage } from './student-groups-page';

/** student-group spec: Show student group details (REQ-003, REQ-007, REQ-008, REQ-010). */
describe('Student group details dialog', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;

  const recent = (n: number) => ({
    id: 100 - n,
    droneId: n,
    drone: `TELLO-0${n}`,
    loanDate: `2026-03-0${n}`,
    returnDate: `2026-03-0${n + 1}`,
    batteries: 0,
    propellers: 0,
  });
  const details: StudentGroupDetails = {
    id: 1,
    name: 'Group 1',
    retired: false,
    activeLoans: [
      {
        id: 41,
        droneId: 2,
        drone: 'TELLO-02',
        loanDate: '2026-03-10',
        daysOut: 5,
        batteries: 2,
        propellers: 4,
      },
    ],
    recentLoans: [5, 4, 3, 2, 1].map(recent),
  };

  const dialog = () => document.querySelector<HTMLElement>('app-student-group-details-dialog');
  const field = (name: string) =>
    dialog()!.querySelector(`[data-active-loan] [data-field="${name}"]`)!.textContent!.trim();
  const returnButton = () =>
    dialog()!.querySelector<HTMLButtonElement>('button[aria-label="Return TELLO-02"]');
  const nameButton = () =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Details of Group 1"]',
    )!;
  const recentItems = () =>
    Array.from(dialog()!.querySelectorAll('li')).map((li) =>
      Array.from(li.querySelectorAll('span'))
        .map((span) => span.textContent!.trim())
        .join(' | '),
    );

  function open(): void {
    nameButton().focus();
    nameButton().click();
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/student-groups/1' }).flush(details);
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
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/student-groups' })
      .flush([{ id: 1, name: 'Group 1' }]);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('Details of a group with loans', () => {
    open();

    expect(dialog()!.textContent).toContain('Group 1');
    expect(dialog()!.textContent).not.toContain('Retired');
    expect(field('drone')).toBe('TELLO-02');
    expect(field('loanDate')).toBe('10.03.2026');
    expect(field('daysOut')).toBe('5 days');
    expect(field('batteries')).toBe('2');
    expect(field('propellers')).toBe('4');
    expect(returnButton()).not.toBeNull();
    expect(recentItems()).toEqual([
      'TELLO-05 | 05.03.2026 to 06.03.2026',
      'TELLO-04 | 04.03.2026 to 05.03.2026',
      'TELLO-03 | 03.03.2026 to 04.03.2026',
      'TELLO-02 | 02.03.2026 to 03.03.2026',
      'TELLO-01 | 01.03.2026 to 02.03.2026',
    ]);
  });

  it('Return from the group dialog', () => {
    open();

    returnButton()!.click();
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: '/api/loans/41/return' }).flush({});
    http.expectOne({ method: 'GET', url: '/api/student-groups/1' }).flush({
      ...details,
      activeLoans: [],
      recentLoans: [
        { ...details.activeLoans[0], returnDate: '2026-03-15' },
        ...details.recentLoans.slice(0, 4),
      ],
    });
    fixture.detectChanges();

    expect(returnButton()).toBeNull();
    expect(dialog()!.textContent).toContain('No active loans.');
    expect(recentItems()[0]).toBe('TELLO-02 | 10.03.2026 to 15.03.2026');
  });

  it('Unknown group: a rejected request closes the dialog', () => {
    nameButton().click();
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/student-groups/1' })
      .flush(
        { detail: 'No student group with the Id 1 exists.' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    expect(dialog()).toBeNull();
  });

  it('Close the group dialog with Escape', async () => {
    open();

    dialog()!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(nameButton());
  });
});
