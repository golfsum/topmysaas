import "server-only";

import type { DocumentData } from "firebase-admin/firestore";

import { getAdminDb } from "./firebase-admin";

export const BOARD_STATES_COLLECTION = "boardStates";

export function parseBoardGeneration(data: DocumentData | undefined): number {
  const value = data?.generation;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

export async function getBoardGeneration(weekId: string): Promise<number> {
  const snapshot = await getAdminDb()
    .collection(BOARD_STATES_COLLECTION)
    .doc(weekId)
    .get();
  return parseBoardGeneration(snapshot.data());
}
