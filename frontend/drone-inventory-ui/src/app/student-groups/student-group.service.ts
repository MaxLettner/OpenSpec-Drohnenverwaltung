import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateStudentGroupRequest,
  StudentGroup,
  StudentGroupDetails,
  UpdateStudentGroupRequest,
} from './student-group.models';

/** Talks to the student group endpoints of the backend (REQ-003). */
@Injectable({ providedIn: 'root' })
export class StudentGroupService {
  private readonly http = inject(HttpClient);

  list(): Observable<StudentGroup[]> {
    return this.http.get<StudentGroup[]>('/api/student-groups');
  }

  /** The details of one group (student-group spec "Show student group details"). */
  details(id: number): Observable<StudentGroupDetails> {
    return this.http.get<StudentGroupDetails>(`/api/student-groups/${id}`);
  }

  create(request: CreateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.post<StudentGroup>('/api/student-groups', request);
  }

  /** Changes the name of a student group (student group spec "Edit a student group"). */
  update(id: number, request: UpdateStudentGroupRequest): Observable<StudentGroup> {
    return this.http.put<StudentGroup>(`/api/student-groups/${id}`, request);
  }
}
