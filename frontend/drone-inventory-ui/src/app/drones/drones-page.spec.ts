import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DronesPage } from './drones-page';

describe('DronesPage (REQ-002)', () => {
  let fixture: ComponentFixture<DronesPage>;
  let http: HttpTestingController;

  const element = () => fixture.nativeElement as HTMLElement;

  /** Text of every table row as the cells of name, availability and description. */
  const rows = () =>
    Array.from(element().querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DronesPage);
  });

  afterEach(() => http.verify());

  it('shows the loading state until the drones have arrived (REQ-002)', () => {
    fixture.detectChanges();
    expect(element().textContent).toContain('Loading drones...');
    expect(element().querySelector('table')).toBeNull();

    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    fixture.detectChanges();
    expect(element().textContent).not.toContain('Loading drones...');
  });

  it('lists a loaned and an available drone with their availability text (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([
      { id: 1, name: 'TELLO-02', description: 'SSID: TELLO-1A2B3C', availability: 'Loaned' },
      { id: 2, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
    ]);
    fixture.detectChanges();

    expect(rows()).toEqual([
      ['TELLO-02', 'Loaned', 'SSID: TELLO-1A2B3C'],
      ['TELLO-07', 'Available', 'SSID: TELLO-9FA21B'],
    ]);

    const badges = Array.from(element().querySelectorAll('.badge')) as HTMLElement[];
    expect(badges.map((badge) => badge.classList.contains('badge-loaned'))).toEqual([true, false]);
    expect(badges.map((badge) => badge.classList.contains('badge-available'))).toEqual([
      false,
      true,
    ]);
  });

  it('shows an em dash when a drone has no description (REQ-002)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush([{ id: 3, name: 'TELLO-08', description: null, availability: 'Available' }]);
    fixture.detectChanges();

    expect(rows()).toEqual([['TELLO-08', 'Available', '—']]);
  });

  it('shows the empty state when no drone exists (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);
    fixture.detectChanges();

    expect(element().textContent).toContain('No drones yet.');
    expect(element().querySelector('table')).toBeNull();
  });

  it('keeps the order in which the backend delivers the drones (REQ-002)', () => {
    fixture.detectChanges();
    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([
      { id: 5, name: 'ALPHA-1', description: null, availability: 'Loaned' },
      { id: 4, name: 'BRAVO-2', description: null, availability: 'Available' },
      { id: 9, name: 'CHARLIE-3', description: null, availability: 'Available' },
    ]);
    fixture.detectChanges();

    expect(rows().map((row) => row[0])).toEqual(['ALPHA-1', 'BRAVO-2', 'CHARLIE-3']);
  });

  it('shows neither the list nor the empty state when loading fails (REQ-002)', () => {
    fixture.detectChanges();
    http
      .expectOne({ method: 'GET', url: '/api/drones' })
      .flush({ title: 'Server error', status: 500 }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element().querySelector('table')).toBeNull();
    expect(element().textContent).not.toContain('No drones yet.');
    expect(element().textContent).not.toContain('Loading drones...');
  });
});
