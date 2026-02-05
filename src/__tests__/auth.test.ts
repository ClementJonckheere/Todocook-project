import { hashPassword, verifyPassword } from "@/lib/auth";

describe("Password hashing", () => {
  it("hashes a password", () => {
    const hash = hashPassword("mypassword");
    expect(hash).toBeDefined();
    expect(hash).toContain(":");
    expect(hash.split(":")).toHaveLength(2);
  });

  it("produces different hashes for the same password (due to random salt)", () => {
    const hash1 = hashPassword("mypassword");
    const hash2 = hashPassword("mypassword");
    expect(hash1).not.toBe(hash2);
  });

  it("verifies a correct password", () => {
    const hash = hashPassword("testpassword");
    expect(verifyPassword("testpassword", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("testpassword");
    expect(verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("handles special characters", () => {
    const password = "p@$$w0rd!#%^&*()";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("other", hash)).toBe(false);
  });

  it("handles unicode characters", () => {
    const password = "motdepasse-français-日本語";
    const hash = hashPassword(password);
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it("handles empty string", () => {
    const hash = hashPassword("");
    expect(verifyPassword("", hash)).toBe(true);
    expect(verifyPassword("notempty", hash)).toBe(false);
  });
});
