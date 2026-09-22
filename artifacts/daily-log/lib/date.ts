export const pad = (value: number) => String(value).padStart(2, '0');
export const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const parseIso = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
export const shiftDays = (value: string, amount: number) => {
  const date = parseIso(value);
  date.setDate(date.getDate() + amount);
  return iso(date);
};
export const startOfWeek = (value: string) => {
  const date = parseIso(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return iso(date);
};
export const displayDate = (value: string) =>
  parseIso(value).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
export const shortDate = (value: string) =>
  parseIso(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });