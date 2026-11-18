import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { StudentGroup } from './student-group.models';
import { StudentGroupsPage } from './student-groups-page';

/** student-group spec: Retire a student group (REQ-003, REQ-010). */
describe('Retire a student group', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let toasts: ToastService;

  const groups: StudentGroup[] = [
    { id: 1, name: 'Group 1' },
    { id: 9, name: 'Group 9' },
  ];

  const dialog = () => document.querySelector<HTMLElement>('app-retire-dialog');
  const dialogButton = (text: string) =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;

  function openRetire(name: string): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>(`button[aria-label="Retire ${name}"]`)!
      .click();
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('asks for confirmation with the name and the consequences', () => {
    openRetire('Group 9');

    expect(dialog()!.textContent!.replace(/\s+/g, ' ')).toContain(
      'Retire Group 9? It disappears from the lists and the loan form, the history keeps it.',
    );
  });

  it('Retire a group without active loans: confirming retires it and reloads the list', () => {
    openRetire('Group 9');

    dialogButton('Retire').click();
    fixture.detectChanges();
    http.expectOne({ method: 'POST', url: '/api/student-groups/9/retire' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush([groups[0]]);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Group 9');
  });

  it('Group with an active loan cannot be retired: the error toast shows and the group stays', () => {
    openRetire('Group 1');

    dialogButton('Retire').click();
    fixture.detectChanges();
    http
      .expectOne({ method: 'POST', url: '/api/student-groups/1/retire' })
      .flush(
        { status: 409, detail: 'Student group 1 has an active loan and cannot be retired.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'Student group 1 has an active loan and cannot be retired.',
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Group 1');
  });

  it('Cancel closes the confirmation without a request', () => {
    openRetire('Group 9');

    dialogButton('Cancel').click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
  });
});
