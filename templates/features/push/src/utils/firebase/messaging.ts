import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../../config/env.js";
import { ServiceUnavailableError, ERROR_CODES } from "../../errors/index.js";

/** Initialize once, on first send; importing routes never initializes Firebase. */
export function getFirebaseMessaging() {
  if (!env.PUSH_ENABLED)
    throw new ServiceUnavailableError(
      "Push notifications are not configured",
      ERROR_CODES.PUSH_UNAVAILABLE,
    );
  const existing = getApps().find((app) => app.name === "gold-push");
  if (existing) return getMessaging(existing);
  const credential = env.FIREBASE_CLIENT_EMAIL
    ? cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      })
    : applicationDefault();
  const app = initializeApp({ credential }, "gold-push");
  return getMessaging(app);
}
