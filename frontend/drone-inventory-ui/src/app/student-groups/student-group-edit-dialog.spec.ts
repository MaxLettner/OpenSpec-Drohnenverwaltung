import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { StudentGroup } from './student-group.models';
import { StudentGroupsPage } from './student-groups-page';

/** student-group spec: Edit a student group (REQ-003). */
describe('Student group edit dialog', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;

  const groups: StudentGroup[] = [
    { id: 1, name: 'Group 1' },
    { id: 3, name: 'Group 3' },
  ];

  const dialog = () => document.querySelector<HTMLElement>('app-student-group-edit-dialog');
  const nameInput = () => dialog()!.querySelector<HTMLInputElement>('#edit-student-group-name')!;
  const save = () =>
    Array.from(dialog()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Save')!;

  function type(value: string): void {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function openEdit(name: string): void {
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>(`button[aria-label="Edit ${name}"]`)!
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
    fixture = TestBed.createComponent(StudentGroupsPage);
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    document.querySelectorAll('.cdk-overlay-container').forEach((c) => (c.innerHTML = ''));
  });

  it('opens with the current name and marks the dialog as a card', () => {
    openEdit('Group 3');

    expect(dialog()!.getAttribute('data-slot')).toBe('card');
    expect(nameInput().value).toBe('Group 3');
  });

  it('Rename a group: saves with PUT, closes the dialog and reloads the list', () => {
    openEdit('Group 3');

    type(' Group 3a ');
    save().click();
    const put = http.expectOne({ method: 'PUT', url: '/api/student-groups/3' });
    expect(put.request.body).toEqual({ name: 'Group 3a' });
    put.flush({ id: 3, name: 'Group 3a' });
    http
      .expectOne({ method: 'GET', url: '/api/student-groups' })
      .flush([groups[0], { id: 3, name: 'Group 3a' }]);
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Group 3a');
  });

  it('Name taken by another group: the dialog stays open and shows the error', () => {
    openEdit('Group 3');

    type('group 1');
    save().click();
    http
      .expectOne({ method: 'PUT', url: '/api/student-groups/3' })
      .flush(
        { status: 409, detail: 'A student group named "group 1" already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(dialog()).not.toBeNull();
    expect(dialog()!.querySelector('[data-field="error"]')!.textContent).toContain(
      'A student group named "group 1" already exists.',
    );
  });

  it('a blank name cannot be saved', () => {
    openEdit('Group 1');

    type('  ');

    expect(save().disabled).toBe(true);
  });
});
