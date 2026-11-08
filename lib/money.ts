/** 45000 -> "45 000 so'm" */
export function formatUZS(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits} so'm`;
}
