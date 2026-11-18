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
  /** The Id of the drone's active Loan, null when it is Available (drone spec "Show drones"). */
  activeLoanId: number | null;
}

export interface CreateDroneRequest {
  name: string;
  description?: string;
}

export interface UpdateDroneRequest {
  name: string;
  description: string | null;
}

/** The active Loan in the drone details (`GET /api/drones/{id}`); dates are ISO `yyyy-MM-dd`. */
export interface DroneActiveLoan {
  id: number;
  group: string;
  loanDate: string;
  daysOut: number;
  batteries: number;
  propellers: number;
}

/** A returned Loan in the drone details. */
export interface DroneRecentLoan {
  id: number;
  group: string;
  loanDate: string;
  returnDate: string;
  batteries: number;
  propellers: number;
}

/** `GET /api/drones/{id}`: the drone with its active loan and its last 5 returned loans. */
export interface DroneDetails {
  id: number;
  name: string;
  description: string | null;
  availability: Availability;
  activeLoan: DroneActiveLoan | null;
  recentLoans: DroneRecentLoan[];
}
