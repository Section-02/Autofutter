const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}

export function parseLocalDate(value: string): Date {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (match === null) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error('Date is not a valid calendar day.');
  }

  return date;
}

export function addLocalDays(value: string, amount: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return toLocalDateString(date);
}

export function subtractLocalMonths(value: string, months: number): string {
  const source = parseLocalDate(value);
  const target = new Date(source.getFullYear(), source.getMonth() - months, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(source.getDate(), lastDay));
  return toLocalDateString(target);
}

export function formatLongLocalDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(parseLocalDate(value));
}

export function assertLocalDate(value: string): void {
  parseLocalDate(value);
}
