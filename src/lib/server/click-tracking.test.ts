import { beforeEach, describe, expect, it, vi } from "vitest";

const serverMocks = vi.hoisted(() => ({
  getAdminDb: vi.fn(),
  getBoardGeneration: vi.fn(),
  recordErrorEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("server-only", () => ({}));
vi.mock("./firebase-admin", () => ({ getAdminDb: serverMocks.getAdminDb }));
vi.mock("./board-state", () => ({
  getBoardGeneration: serverMocks.getBoardGeneration,
}));
vi.mock("./error-events", () => ({
  recordErrorEvent: serverMocks.recordErrorEvent,
}));

import { recordPublicListingClick } from "./click-tracking";

const now = new Date("2026-08-22T12:00:00.000Z");

function createDb(
  listingData: Record<string, unknown>,
  commit = vi.fn().mockResolvedValue(undefined),
) {
  const set = vi.fn();
  const listingSnapshot = {
    exists: true,
    id: "clientplot-listing",
    data: () => listingData,
  };

  function collection(path: string) {
    return {
      doc(id: string) {
        return {
          id,
          path: `${path}/${id}`,
          get: vi.fn().mockResolvedValue(listingSnapshot),
          collection(name: string) {
            return collection(`${path}/${id}/${name}`);
          },
        };
      },
    };
  }

  return {
    db: {
      collection,
      batch: () => ({ set, commit }),
    },
    set,
    commit,
  };
}

describe("outbound listing click tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverMocks.getBoardGeneration.mockResolvedValue(2);
  });

  it("increments lifetime, board, and per-listing board counters", async () => {
    const { db, set, commit } = createDb({
      name: "ClientPlot",
      url: "https://clientplot.com",
      normalizedUrl: "https://clientplot.com",
      isActive: true,
      weekId: "2026-08-17",
      boardGeneration: 2,
    });
    serverMocks.getAdminDb.mockReturnValue(db);

    await expect(
      recordPublicListingClick("clientplot-listing", now),
    ).resolves.toBe("https://clientplot.com");

    expect(set).toHaveBeenCalledTimes(3);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("does not redirect or increment a stale listing", async () => {
    const { db, set, commit } = createDb({
      name: "ClientPlot",
      url: "https://clientplot.com",
      normalizedUrl: "https://clientplot.com",
      isActive: true,
      weekId: "2026-08-10",
      boardGeneration: 2,
    });
    serverMocks.getAdminDb.mockReturnValue(db);

    await expect(
      recordPublicListingClick("clientplot-listing", now),
    ).resolves.toBeNull();

    expect(set).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("still opens a valid listing when the metrics write fails", async () => {
    const commit = vi.fn().mockRejectedValue(new Error("write failed"));
    const { db } = createDb(
      {
        name: "ClientPlot",
        url: "https://clientplot.com",
        normalizedUrl: "https://clientplot.com",
        isActive: true,
        weekId: "2026-08-17",
        boardGeneration: 2,
      },
      commit,
    );
    serverMocks.getAdminDb.mockReturnValue(db);

    await expect(
      recordPublicListingClick("clientplot-listing", now),
    ).resolves.toBe("https://clientplot.com");
    expect(serverMocks.recordErrorEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "LISTING_CLICK_WRITE_FAILED",
        listingId: "clientplot-listing",
      }),
    );
  });
});
