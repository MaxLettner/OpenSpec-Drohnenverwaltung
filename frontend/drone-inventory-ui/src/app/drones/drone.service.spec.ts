import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Drone } from './drone.models';
import { DroneService } from './drone.service';

describe('DroneService (REQ-001, REQ-002)', () => {
  let service: DroneService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DroneService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists drones with their availability with GET /api/drones (REQ-002)', () => {
    let result: Drone[] | undefined;
    service.list().subscribe((drones) => (result = drones));

    const req = http.expectOne({ method: 'GET', url: '/api/drones' });
    expect(req.request.body).toBeNull();
    req.flush([
      { id: 1, name: 'TELLO-02', description: '', availability: 'Loaned' },
      { id: 2, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
    ]);

    expect(result).toEqual([
      { id: 1, name: 'TELLO-02', description: '', availability: 'Loaned' },
      { id: 2, name: 'TELLO-07', description: 'SSID: TELLO-9FA21B', availability: 'Available' },
    ]);
  });

  it('returns an empty list when no drone exists (REQ-002)', () => {
    let result: Drone[] | undefined;
    service.list().subscribe((drones) => (result = drones));

    http.expectOne({ method: 'GET', url: '/api/drones' }).flush([]);

    expect(result).toEqual([]);
  });

  it('creates a drone with POST /api/drones and the request as body (REQ-001)', () => {
    let result: Drone | undefined;
    service
      .create({ name: 'TELLO-07', description: 'right propeller guard damaged' })
      .subscribe((drone) => (result = drone));

    const req = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(req.request.body).toEqual({
      name: 'TELLO-07',
      description: 'right propeller guard damaged',
    });
    req.flush(
      {
        id: 7,
        name: 'TELLO-07',
        description: 'right propeller guard damaged',
        availability: 'Available',
      },
      { status: 201, statusText: 'Created' },
    );

    expect(result).toEqual({
      id: 7,
      name: 'TELLO-07',
      description: 'right propeller guard damaged',
      availability: 'Available',
    });
  });

  it('sends only the name when no description is given (REQ-001)', () => {
    service.create({ name: 'TELLO-08' }).subscribe();

    const req = http.expectOne({ method: 'POST', url: '/api/drones' });
    expect(req.request.body).toEqual({ name: 'TELLO-08' });
    req.flush({ id: 8, name: 'TELLO-08', description: '', availability: 'Available' });
  });
});
