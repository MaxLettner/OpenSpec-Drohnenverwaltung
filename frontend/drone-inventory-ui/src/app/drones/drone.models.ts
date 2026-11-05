/** Availability of a Drone, derived by the backend from its active Loan (REQ-002). */
export type Availability = 'Available' | 'Loaned';

/** Limits the backend enforces on a drone, so the form cannot offer more (REQ-001). */
export const MAX_DRONE_NAME_LENGTH = 100;
export const MAX_DRONE_DESCRIPTION_LENGTH = 500;

export interface Drone {
  id: number;
  name: string;
  description: string | null;
  availability: Availability;
}

export interface CreateDroneRequest {
  name: string;
  description?: string;
}
