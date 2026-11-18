import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateDroneRequest, Drone, DroneDetails } from './drone.models';

/** Talks to the drone endpoints of the backend (REQ-001, REQ-002). */
@Injectable({ providedIn: 'root' })
export class DroneService {
  private readonly http = inject(HttpClient);

  list(): Observable<Drone[]> {
    return this.http.get<Drone[]>('/api/drones');
  }

  /** The details of one drone (drone spec "Show drone details"). */
  details(id: number): Observable<DroneDetails> {
    return this.http.get<DroneDetails>(`/api/drones/${id}`);
  }

  create(request: CreateDroneRequest): Observable<Drone> {
    return this.http.post<Drone>('/api/drones', request);
  }
}
