import { checkRateLimit, clientIp, resetRateLimits } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests up to the limit then blocks", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 60_000, now).allowed).toBe(true);
    const blocked = checkRateLimit("k", 3, 60_000, now + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(59);
  });

  it("opens a new window once the previous one has expired", () => {
    for (let i = 0; i < 4; i++) checkRateLimit("k", 3, 60_000, 0);
    expect(checkRateLimit("k", 3, 60_000, 60_000).allowed).toBe(true);
  });

  it("counts keys independently", () => {
    checkRateLimit("a", 1, 60_000, 0);
    expect(checkRateLimit("b", 1, 60_000, 0).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first X-Forwarded-For entry", () => {
    const request = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(request)).toBe("1.2.3.4");
  });
});
