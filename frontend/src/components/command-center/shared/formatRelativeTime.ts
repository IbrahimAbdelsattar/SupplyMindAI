import type { TFunction } from 'i18next';

export function formatRelativeTime(
  iso: string,
  t: TFunction,
  ns: string,
  keyPrefix: string,
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t(`${keyPrefix}.minutes`, { count: mins, ns });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t(`${keyPrefix}.hours`, { count: hrs, ns });
  return t(`${keyPrefix}.days`, { count: Math.floor(hrs / 24), ns });
}
