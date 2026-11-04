import { Pipe, PipeTransform } from '@angular/core';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats an ISO calendar date (`yyyy-MM-dd`, as sent by the API) as `dd.MM.yyyy`.
 * The string parts are rearranged directly, so no JS Date and no timezone is involved.
 * Returns an empty string for null, undefined and invalid input.
 */
@Pipe({
  name: 'dateDisplay',
})
export class DateDisplayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const match = ISO_DATE.exec(value);
    if (!match) {
      return '';
    }

    const [, year, month, day] = match;
    if (!isValidCalendarDate(Number(year), Number(month), Number(day))) {
      return '';
    }

    return `${day}.${month}.${year}`;
  }
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
