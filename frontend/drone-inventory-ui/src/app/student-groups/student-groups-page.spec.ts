import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { errorToastInterceptor } from '../shared/http/error-toast.interceptor';
import { ToastService } from '../shared/toast/toast.service';
import { StudentGroup } from './student-group.models';
import { StudentGroupsPage } from './student-groups-page';

describe('StudentGroupsPage (REQ-003)', () => {
  let fixture: ComponentFixture<StudentGroupsPage>;
  let http: HttpTestingController;
  let toasts: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StudentGroupsPage],
      providers: [
        provideHttpClient(withInterceptors([errorToastInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(StudentGroupsPage);
    http = TestBed.inject(HttpTestingController);
    toasts = TestBed.inject(ToastService);
  });

  afterEach(() => http.verify());

  /** Renders the page and answers its initial list request with the given groups. */
  function loadPage(groups: StudentGroup[]): void {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush(groups);
    fixture.detectChanges();
  }

  function element<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function nameInput(): HTMLInputElement {
    return element<HTMLInputElement>('#student-group-name');
  }

  function createButton(): HTMLButtonElement {
    return element<HTMLButtonElement>('button[type="submit"]');
  }

  function typeName(value: string): void {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitForm(): void {
    element<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function listedNames(): string[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>,
    ).map((cell) => cell.textContent.trim());
  }

  it('adds the created group to the list and clears the name field', () => {
    loadPage([{ id: 1, name: 'Group 1' }]);

    typeName('Group 3');
    submitForm();

    const create = http.expectOne({ method: 'POST', url: '/api/student-groups' });
    expect(create.request.body).toEqual({ name: 'Group 3' });
    create.flush({ id: 3, name: 'Group 3' }, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush([
      { id: 1, name: 'Group 1' },
      { id: 3, name: 'Group 3' },
    ]);
    fixture.detectChanges();

    expect(listedNames()).toEqual(['Group 1', 'Group 3']);
    expect(nameInput().value).toBe('');
  });

  it('renders the student groups in the order the backend returns them', () => {
    loadPage([
      { id: 1, name: 'Group 1' },
      { id: 3, name: 'Group 3' },
    ]);

    expect(listedNames()).toEqual(['Group 1', 'Group 3']);
  });

  it('shows the empty state when no student group exists', () => {
    loadPage([]);

    expect(
      element<HTMLElement>('section[aria-labelledby="student-group-list-heading"]').textContent,
    ).toContain('No student groups yet.');
    expect(element('table')).toBeNull();
  });

  it('keeps the create button disabled for a blank name', () => {
    loadPage([]);
    expect(createButton().disabled).toBe(true);

    typeName('   ');
    expect(createButton().disabled).toBe(true);

    typeName('Group 3');
    expect(createButton().disabled).toBe(false);
  });

  it('disables the create button while the request is running', () => {
    loadPage([]);
    typeName('Group 3');

    submitForm();
    expect(createButton().disabled).toBe(true);

    http
      .expectOne({ method: 'POST', url: '/api/student-groups' })
      .flush({ id: 3, name: 'Group 3' }, { status: 201, statusText: 'Created' });
    http.expectOne({ method: 'GET', url: '/api/student-groups' }).flush([]);
    fixture.detectChanges();
    expect(createButton().disabled).toBe(true);
  });

  it('keeps the entered name and does not add the group after a duplicate error', () => {
    loadPage([{ id: 1, name: 'Group 1' }]);
    typeName('Group 1');

    submitForm();
    http.expectOne({ method: 'POST', url: '/api/student-groups' }).flush(
      {
        title: 'Student group already exists',
        status: 409,
        detail: 'A student group named "Group 1" already exists.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(nameInput().value).toBe('Group 1');
    expect(listedNames()).toEqual(['Group 1']);
    expect(createButton().disabled).toBe(false);
    expect(toasts.toasts().map((toast) => toast.message)).toEqual([
      'A student group named "Group 1" already exists.',
    ]);
  });

  // ui-theme: "Same look on every page"
  it('uses the shared button, input and table styles', () => {
    loadPage([{ id: 1, name: 'Group 1' }]);

    expect(createButton().getAttribute('data-slot')).toBe('button');
    expect(nameInput().getAttribute('data-slot')).toBe('input');
    expect(element('div[data-slot="table-container"] table[data-slot="table"]')).not.toBeNull();
  });
});
