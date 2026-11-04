/** State of a Loan: `Active` until the drone is returned, then `Returned`. */
export type LoanStatus = 'Active' | 'Returned';

/** Accessory type of a LoanItem. */
export type LoanItemType = 'Battery' | 'Propeller';

export interface LoanItem {
  type: LoanItemType;
  quantity: number;
}

export interface CreateLoanRequest {
  droneId: number;
  studentGroupId: number;
  items?: LoanItem[];
}

/** A single Loan as returned by the loan endpoints. Dates are ISO `yyyy-MM-dd` strings. */
export interface Loan {
  id: number;
  droneId: number;
  studentGroupId: number;
  status: LoanStatus;
  loanDate: string;
  returnDate: string | null;
  items: LoanItem[];
}

/** One row of `GET /api/loans/active`; accessory counts are 0 when the loan has no such item. */
export interface ActiveLoanRow {
  id: number;
  group: string;
  drone: string;
  batteries: number;
  propellers: number;
  loanDate: string;
}

/** One row of `GET /api/loans/history`. */
export interface LoanHistoryRow extends ActiveLoanRow {
  returnDate: string;
}
