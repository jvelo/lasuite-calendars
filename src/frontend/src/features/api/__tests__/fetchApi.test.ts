import { APIError, NetworkError } from "../APIError";
import { fetchAPI } from "../fetchApi";

describe("fetchAPI", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a NetworkError when the request cannot reach the server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchAPI("users/")).rejects.toBeInstanceOf(NetworkError);
  });

  it("does not throw a NetworkError for a malformed request", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const error = await fetchAPI("users/", { method: "GET", body: "{}" }).catch((e) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws an APIError for an error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response('{"detail": "Not found"}', { status: 404 })),
    );
    await expect(fetchAPI("users/")).rejects.toBeInstanceOf(APIError);
  });
});
