/** Internal domain callers choose recipients; HTTP clients cannot send arbitrary notifications. */
export interface NotificationInput {
  title: string;
  body: string;
  data?: Record<string, string>;
}
export interface PushResult {
  outcome: "accepted" | "skipped" | "failed";
  accepted: number;
}
export interface NotificationResult {
  inbox: "saved" | "disabled";
  push: PushResult;
}
