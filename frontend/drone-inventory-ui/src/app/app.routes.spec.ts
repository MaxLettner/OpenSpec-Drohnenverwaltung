import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { DronesPage } from './drones/drones-page';
import { StudentGroupsPage } from './student-groups/student-groups-page';
import { LoansPage } from './loans/loans-page';
import { LoanHistoryPage } from './loans/loan-history-page';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('shows the drones page for the empty path', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/', DronesPage);
    expect(page).toBeInstanceOf(DronesPage);
  });

  it('shows the drones page for /drones', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/drones', DronesPage);
    expect(page).toBeInstanceOf(DronesPage);
  });

  it('shows the student groups page for /student-groups', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/student-groups', StudentGroupsPage);
    expect(page).toBeInstanceOf(StudentGroupsPage);
  });

  it('shows the loans page for /loans', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/loans', LoansPage);
    expect(page).toBeInstanceOf(LoansPage);
  });

  it('shows the history page for /loans/history', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/loans/history', LoanHistoryPage);
    expect(page).toBeInstanceOf(LoanHistoryPage);
  });

  it('redirects unknown paths to the drones page', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/does-not-exist', DronesPage);
    expect(page).toBeInstanceOf(DronesPage);
  });
});
