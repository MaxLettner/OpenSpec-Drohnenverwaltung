import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StudentGroup } from './student-group.models';
import { StudentGroupService } from './student-group.service';

describe('StudentGroupService (REQ-003)', () => {
  let service: StudentGroupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudentGroupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists student groups with GET /api/student-groups', () => {
    let result: StudentGroup[] | undefined;
    service.list().subscribe((groups) => (result = groups));

    const req = http.expectOne({ method: 'GET', url: '/api/student-groups' });
    expect(req.request.body).toBeNull();
    req.flush([
      { id: 1, name: 'Group 1' },
      { id: 3, name: 'Group 3' },
    ]);

    expect(result).toEqual([
      { id: 1, name: 'Group 1' },
      { id: 3, name: 'Group 3' },
    ]);
  });

  it('creates a student group with POST /api/student-groups (REQ-003)', () => {
    let result: StudentGroup | undefined;
    service.create({ name: 'Group 3' }).subscribe((group) => (result = group));

    const req = http.expectOne({ method: 'POST', url: '/api/student-groups' });
    expect(req.request.body).toEqual({ name: 'Group 3' });
    req.flush({ id: 3, name: 'Group 3' }, { status: 201, statusText: 'Created' });

    expect(result).toEqual({ id: 3, name: 'Group 3' });
  });
});
