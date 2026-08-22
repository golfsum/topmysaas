import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseClientConfigured = Object.values(
  firebaseClientConfig,
).every((value) => typeof value === "string" && value.length > 0);

let firebaseClientApp: FirebaseApp | undefined;
let firebaseClientAuth: Auth | undefined;

export function getFirebaseClientApp(): FirebaseApp {
  if (!isFirebaseClientConfigured) {
    throw new Error(
      "Firebase Authentication is not configured for this environment.",
    );
  }

  firebaseClientApp ??=
    getApps().length > 0 ? getApp() : initializeApp(firebaseClientConfig);

  return firebaseClientApp;
}

export function getFirebaseAuth(): Auth {
  firebaseClientAuth ??= getAuth(getFirebaseClientApp());
  const emulatorUrl =
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL?.trim();
  const emulatorState = globalThis as typeof globalThis & {
    __topMySaasAuthEmulatorConnected?: boolean;
  };
  if (emulatorUrl && !emulatorState.__topMySaasAuthEmulatorConnected) {
    connectAuthEmulator(firebaseClientAuth, emulatorUrl, {
      disableWarnings: true,
    });
    emulatorState.__topMySaasAuthEmulatorConnected = true;
  }
  return firebaseClientAuth;
}
