import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchApi, getApiBaseUrl, getToken, setToken } from "@/lib/api";

describe("API authentication handling", () => {
  afterEach(() => {
    setToken(null);
    vi.unstubAllGlobals();
  });

  it("adds the bearer token to authenticated requests", async () => {
    setToken("test-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchApi("/settings");

    expect(fetchMock).toHaveBeenCalledWith(
      `${getApiBaseUrl()}/settings`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("clears an expired token after a 401 response", async () => {
    setToken("expired-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Invalid or expired token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchApi("/settings")).rejects.toThrow("Invalid or expired token");
    expect(getToken()).toBeNull();
  });
});
