import { createHash, randomUUID } from "node:crypto";

import {
  applicationDefault,
  cert,
  deleteApp,
  initializeApp,
} from "firebase-admin/app";
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";

const PRELAUNCH_LISTINGS = [
  {
    name: "ClientPlot.com",
    url: "https://clientplot.com/",
    description: "ClientPlot's official product website.",
    bidAmountCents: 600,
  },
  {
    name: "AppsResolve.com",
    url: "https://appsresolve.com/",
    description: "AI-assisted application support with human review.",
    bidAmountCents: 500,
  },
];

function currentUtcWeekId(now = new Date()) {
  const utcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(utcMidnight - daysSinceMonday * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function normalizedUrl(value) {
  const parsed = new URL(value);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname === "/") {
    parsed.pathname = "";
  } else {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString().replace(/\/$/, "");
}

function listingId(url) {
  return `admin-${createHash("sha256")
    .update(normalizedUrl(url))
    .digest("hex")
    .slice(0, 32)}`;
}

function tombstoneId(weekId, url) {
  const urlHash = createHash("sha256")
    .update(normalizedUrl(url))
    .digest("hex")
    .slice(0, 40);
  return `${weekId}_${urlHash}`;
}

function nextUtcMonday(now = new Date()) {
  const next = new Date(`${currentUtcWeekId(now)}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

function firebaseAppOptions() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const hasExplicitCredential = Boolean(projectId && clientEmail && privateKey);
  const hasPartialCredential = Boolean(projectId || clientEmail || privateKey);

  if (hasPartialCredential && !hasExplicitCredential) {
    throw new Error(
      "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY together.",
    );
  }

  return hasExplicitCredential
    ? {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      }
    : {
        credential: applicationDefault(),
        ...(projectId ? { projectId } : {}),
      };
}

async function seed() {
  const weekId = currentUtcWeekId();
  const preview = {
    weekId,
    settings: { minBidCents: 500, minIncrementCents: 100 },
    listings: PRELAUNCH_LISTINGS.map(({ name, url, bidAmountCents }) => ({
      name,
      url,
      bidAmountCents,
    })),
  };

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const app = initializeApp(firebaseAppOptions(), "topmysaas-prelaunch-seed");
  try {
    const db = getFirestore(app);
    const stateSnapshot = await db.collection("boardStates").doc(weekId).get();
    const stateGeneration = stateSnapshot.data()?.generation;
    const boardGeneration =
      typeof stateGeneration === "number" &&
      Number.isSafeInteger(stateGeneration) &&
      stateGeneration >= 0
        ? stateGeneration
        : 0;
    const now = Timestamp.now();
    const batch = db.batch();

    batch.set(
      db.doc("settings/board"),
      {
        minBidCents: 500,
        minIncrementCents: 100,
        checkoutCloseMinutes: 30,
        currency: "usd",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    for (const listing of PRELAUNCH_LISTINGS) {
      const canonicalUrl = normalizedUrl(listing.url);
      const matching = await db
        .collection("listings")
        .where("normalizedUrl", "==", canonicalUrl)
        .where("weekId", "==", weekId)
        .where("boardGeneration", "==", boardGeneration)
        .limit(1)
        .get();
      if (!matching.empty) {
        console.log(`Skipped ${listing.name}; it already exists on the current board.`);
        continue;
      }

      const id = listingId(canonicalUrl);
      const listingRef = db.collection("listings").doc(id);
      const existing = await listingRef.get();
      if (existing.exists) {
        console.log(`Skipped ${listing.name}; its seed document already exists.`);
        continue;
      }

      batch.set(listingRef, {
        ...listing,
        url: canonicalUrl,
        normalizedUrl: canonicalUrl,
        bidAmount: listing.bidAmountCents / 100,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        weekId,
        boardGeneration,
        source: "admin",
      });
      batch.set(
        db.collection("listingTombstones").doc(tombstoneId(weekId, canonicalUrl)),
        {
          removalId: randomUUID(),
          listingId: id,
          normalizedUrl: canonicalUrl,
          weekId,
          boardGeneration,
          expiresAt: Timestamp.fromDate(nextUtcMonday()),
          restoredBySeedAt: FieldValue.serverTimestamp(),
        },
      );
    }

    await batch.commit();
    console.log(
      `Pre-launch seed completed for board ${weekId}, generation ${boardGeneration}.`,
    );
  } finally {
    await deleteApp(app);
  }
}

await seed();
