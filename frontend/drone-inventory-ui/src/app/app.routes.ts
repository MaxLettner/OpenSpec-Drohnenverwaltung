import { Routes } from '@angular/router';
import { DronesPage } from './drones/drones-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';
import { LoansPage } from './loans/loans-page';
import { LoanHistoryPage } from './loans/loan-history-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'drones' },
  { path: 'drones', component: DronesPage },
  { path: 'student-groups', component: StudentGroupsPage },
  { path: 'loans', component: LoansPage },
  { path: 'loans/history', component: LoanHistoryPage },
  { path: '**', redirectTo: 'drones' },
];
