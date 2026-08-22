import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { ApiError } from "./api-error";

const APP_NAME = "topmysaas-server";

let cachedApp: App | undefined;
let cachedAuth: Auth | undefined;
let cachedDb: Firestore | undefined;

function projectId(): string | undefined {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim()
  );
}

export function isFirebaseAdminConfigured(): boolean {
  const hasProject = Boolean(projectId());
  const hasExplicitCredentials = Boolean(
    process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim(),
  );
  const hasDefaultCredentials = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT,
  );
  const usesEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  return hasProject && (hasExplicitCredentials || hasDefaultCredentials || usesEmulator);
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) {
    cachedApp = existing;
    return existing;
  }

  const resolvedProjectId = projectId();
  if (!resolvedProjectId) {
    throw new ApiError(
      503,
      "FIREBASE_NOT_CONFIGURED",
      "Firebase is not configured for this environment.",
    );
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (clientEmail && privateKey) {
    cachedApp = initializeApp(
      {
        projectId: resolvedProjectId,
        credential: cert({
          projectId: resolvedProjectId,
          clientEmail,
          privateKey,
        }),
      },
      APP_NAME,
    );
    return cachedApp;
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    cachedApp = initializeApp({ projectId: resolvedProjectId }, APP_NAME);
    return cachedApp;
  }

  cachedApp = initializeApp(
    { projectId: resolvedProjectId, credential: applicationDefault() },
    APP_NAME,
  );
  return cachedApp;
}

export function getAdminAuth(): Auth {
  cachedAuth ??= getAuth(getAdminApp());
  return cachedAuth;
}

export function getAdminDb(): Firestore {
  cachedDb ??= getFirestore(getAdminApp());
  return cachedDb;
}
