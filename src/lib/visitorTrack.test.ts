import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, createClient } = vi.hoisted(() => {
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  return { insert, createClient: vi.fn(() => ({ from: () => ({ insert }) })) };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { supabaseUrl: "https://example.test", supabaseKey: "public-test-key" },
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));

describe("visitor tracking storage resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    insert.mockClear();
    insert.mockImplementation(() => Promise.resolve({ error: null }));
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/?src=claude_test");
    vi.spyOn(crypto, "randomUUID").mockReturnValue("12345678-1234-4234-8234-123456789abc");
  });

  it("keeps URL src and the visitor ID when storage reads and writes fail", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const tracking = await import("./visitorTrack");
    tracking.trackLanded();
    tracking.trackLanded();
    window.history.replaceState({}, "", "/auth");
    tracking.trackInitialAuthViewed();
    tracking.trackAuthViewed();
    expect(insert.mock.calls.map(([event]) => event)).toEqual([
      { visitor_id: "12345678-1234-4234-8234-123456789abc", event_name: "landed", src: "claude_test" },
      { visitor_id: "12345678-1234-4234-8234-123456789abc", event_name: "auth_viewed", src: "claude_test" },
    ]);
  });

  it("restores the visitor ID and source across page loads without another landed event", async () => {
    const first = await import("./visitorTrack");
    first.trackLanded();
    vi.resetModules();
    window.history.replaceState({}, "", "/auth");
    const second = await import("./visitorTrack");
    second.trackLanded();
    second.trackInitialAuthViewed();
    second.trackAuthViewed();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[1]?.[0]).toEqual(insert.mock.calls[0]?.[0] && {
      ...insert.mock.calls[0][0], event_name: "auth_viewed",
    });
  });

  it("silently handles rejected inserts without returning a blocking promise", async () => {
    insert.mockImplementation(() => Promise.reject(new Error("network unavailable")));
    const tracking = await import("./visitorTrack");
    expect(tracking.trackAuthViewed()).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});