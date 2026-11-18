/** Maximum length of a student group name, as in the backend (REQ-003). */
export const MAX_STUDENT_GROUP_NAME_LENGTH = 100;

export interface StudentGroup {
  id: number;
  name: string;
}

export interface CreateStudentGroupRequest {
  name: string;
}

/** An active loan in the group details (student-group spec "Show student group details"). */
export interface StudentGroupActiveLoan {
  id: number;
  droneId: number;
  drone: string;
  /** ISO date, e.g. "2026-03-10". */
  loanDate: string;
  daysOut: number;
  batteries: number;
  propellers: number;
}

/** A returned loan in the group details. */
export interface StudentGroupRecentLoan {
  id: number;
  droneId: number;
  drone: string;
  loanDate: string;
  returnDate: string;
  batteries: number;
  propellers: number;
}

export interface StudentGroupDetails {
  id: number;
  name: string;
  /** Oldest loan date first. */
  activeLoans: StudentGroupActiveLoan[];
  /** The last 5 returned loans, latest return first. */
  recentLoans: StudentGroupRecentLoan[];
}
