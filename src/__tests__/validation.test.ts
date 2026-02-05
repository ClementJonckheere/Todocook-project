import {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePositiveNumber,
  validateMaxLength,
} from "@/lib/validation";

describe("validateRequired", () => {
  it("returns errors for missing required fields", () => {
    const errors = validateRequired({ name: "", email: null }, ["name", "email"]);
    expect(errors).toHaveLength(2);
    expect(errors[0].field).toBe("name");
    expect(errors[1].field).toBe("email");
  });

  it("returns no errors when fields are present", () => {
    const errors = validateRequired({ name: "Test", email: "test@test.fr" }, ["name", "email"]);
    expect(errors).toHaveLength(0);
  });

  it("detects undefined fields", () => {
    const errors = validateRequired({}, ["name"]);
    expect(errors).toHaveLength(1);
  });
});

describe("validateEmail", () => {
  it("validates correct email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("test@todocook.fr")).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("@missing.com")).toBe(false);
    expect(validateEmail("missing@")).toBe(false);
    expect(validateEmail("")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("rejects short passwords", () => {
    const errors = validatePassword("abc");
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("password");
  });

  it("accepts valid passwords", () => {
    const errors = validatePassword("password123");
    expect(errors).toHaveLength(0);
  });

  it("rejects empty password", () => {
    const errors = validatePassword("");
    expect(errors).toHaveLength(1);
  });
});

describe("validatePositiveNumber", () => {
  it("accepts positive numbers", () => {
    expect(validatePositiveNumber(5, "age")).toHaveLength(0);
    expect(validatePositiveNumber(0, "value")).toHaveLength(0);
  });

  it("rejects negative numbers", () => {
    expect(validatePositiveNumber(-1, "age")).toHaveLength(1);
  });

  it("accepts undefined/null", () => {
    expect(validatePositiveNumber(undefined, "age")).toHaveLength(0);
    expect(validatePositiveNumber(null, "age")).toHaveLength(0);
  });
});

describe("validateMaxLength", () => {
  it("accepts strings within limit", () => {
    expect(validateMaxLength("hello", "name", 10)).toHaveLength(0);
  });

  it("rejects strings exceeding limit", () => {
    const errors = validateMaxLength("a".repeat(201), "name", 200);
    expect(errors).toHaveLength(1);
  });

  it("handles null/undefined", () => {
    expect(validateMaxLength(null, "name", 10)).toHaveLength(0);
    expect(validateMaxLength(undefined, "name", 10)).toHaveLength(0);
  });
});
