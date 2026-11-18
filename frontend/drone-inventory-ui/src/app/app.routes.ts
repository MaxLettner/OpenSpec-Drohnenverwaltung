import { Routes } from '@angular/router';
import { DronesPage } from './drones/drones-page';
import { HomePage } from './home/home-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';
import { LoansPage } from './loans/loans-page';
import { LoanHistoryPage } from './loans/loan-history-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomePage },
  { path: 'drones', component: DronesPage },
  { path: 'student-groups', component: StudentGroupsPage },
  { path: 'loans', component: LoansPage },
  { path: 'loans/history', component: LoanHistoryPage },
  { path: '**', redirectTo: '' },
];
