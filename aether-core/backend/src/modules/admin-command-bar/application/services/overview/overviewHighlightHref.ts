/** Build overview highlight path for notifications. */
export function overviewHighlightHref(
  kind: 'activity' | 'approval' | 'proactive' | 'section' | 'goal' | 'handoff',
  id: string,
): string {
  return `/overview?highlight=${encodeURIComponent(`${kind}:${id}`)}`;
}
