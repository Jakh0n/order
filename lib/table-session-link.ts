/** Query parameter on table QR codes: /{slug}?t=5 */
export const TABLE_PARAM = "t";

export function tableLink(origin: string, slug: string, table: number): string {
  return `${origin}/${slug}?${TABLE_PARAM}=${table}`;
}
