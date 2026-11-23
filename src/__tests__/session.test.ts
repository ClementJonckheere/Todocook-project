import { hashToken, readSessionToken } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";

describe("readSessionToken", () => {
  const token = "a".repeat(43);

  it("prefers a well-formed Bearer token", () => {
    expect(readSessionToken(`Bearer ${token}`, "cookie-value")).toBe(token);
  });

  it("falls back to the session cookie", () => {
    expect(readSessionToken(null, "cookie-value")).toBe("cookie-value");
  });

  it("ignores malformed Authorization headers", () => {
    expect(readSessionToken("Bearer short", undefined)).toBeNull();
    expect(readSessionToken("Basic dXNlcjpwYXNz", undefined)).toBeNull();
  });
});

describe("hashToken", () => {
  it("is deterministic and never returns the raw token", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toContain("abc");
    expect(hashToken("abc")).toHaveLength(64);
  });
});

describe("verifyPassword robustness", () => {
  it("rejects missing or malformed stored hashes without throwing", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "nosalt")).toBe(false);
    expect(verifyPassword("x", "salt:not-hex")).toBe(false);
  });

  it("still verifies a real hash", () => {
    expect(verifyPassword("correct horse", hashPassword("correct horse"))).toBe(true);
  });
});
