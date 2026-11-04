import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActiveLoanRow, CreateLoanRequest, Loan, LoanHistoryRow } from './loan.models';

/** Talks to the loan endpoints of the backend (REQ-004 to REQ-010). */
@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly http = inject(HttpClient);

  create(request: CreateLoanRequest): Observable<Loan> {
    return this.http.post<Loan>('/api/loans', request);
  }

  get(id: number): Observable<Loan> {
    return this.http.get<Loan>(`/api/loans/${id}`);
  }

  return(id: number): Observable<Loan> {
    return this.http.post<Loan>(`/api/loans/${id}/return`, null);
  }

  listActive(): Observable<ActiveLoanRow[]> {
    return this.http.get<ActiveLoanRow[]>('/api/loans/active');
  }

  listHistory(): Observable<LoanHistoryRow[]> {
    return this.http.get<LoanHistoryRow[]>('/api/loans/history');
  }
}
