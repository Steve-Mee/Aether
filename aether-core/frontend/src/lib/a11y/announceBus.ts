/** Module-level bridge so non-React code (toast, notification push) can reach LiveAnnouncer. */

type AnnounceFn = (message: string) => void;

let announcePoliteFn: AnnounceFn | null = null;
let announceAssertiveFn: AnnounceFn | null = null;

export function registerLiveAnnouncers(polite: AnnounceFn, assertive: AnnounceFn): () => void {
  announcePoliteFn = polite;
  announceAssertiveFn = assertive;
  return () => {
    announcePoliteFn = null;
    announceAssertiveFn = null;
  };
}

export function announceStatus(message: string): void {
  announcePoliteFn?.(message);
}

export function announceAssertive(message: string): void {
  announceAssertiveFn?.(message);
}
