/** Availability of a Drone, derived by the backend from its active Loan (REQ-002). */
export type Availability = 'Available' | 'Loaned';

export interface Drone {
  id: number;
  name: string;
  description: string;
  availability: Availability;
}

export interface CreateDroneRequest {
  name: string;
  description?: string;
}
