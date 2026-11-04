import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateStudentGroupRequest, StudentGroup } from './student-group.models';

/** Talks to the student group endpoints of the backend (REQ-003). */
@Injectable({ providedIn: 'root' })
export class StudentGroupService {
  private readonly http = inject(HttpClient);

  list(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>('/api/student-groups');
  }

  create(request: CreateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.post<StudentGroup>('/api/student-groups', request);
  }
}
