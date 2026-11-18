/** `GET /api/dashboard`: live figures computed by the backend (dashboard spec, design D1). */
export interface Dashboard {
  drones: { total: number; available: number; loaned: number };
  studentGroups: number;
  loans: { active: number; returned: number };
  accessoriesOut: { batteries: number; propellers: number };
  longestActiveLoans: LongActiveLoan[];
  loansPerWeek: WeekCount[];
}

/** An active loan with the days since its loan date; dates are ISO `yyyy-MM-dd`. */
export interface LongActiveLoan {
  id: number;
  group: string;
  drone: string;
  loanDate: string;
  daysOut: number;
}

/** The loans started in the week that begins on Monday `weekStart`. */
export interface WeekCount {
  weekStart: string;
  count: number;
}
