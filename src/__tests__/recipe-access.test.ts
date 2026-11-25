import { parseRecipeId } from "@/lib/recipe-access";

describe("parseRecipeId", () => {
  it("accepts positive integers given as numbers or strings", () => {
    expect(parseRecipeId(12)).toBe(12);
    expect(parseRecipeId("12")).toBe(12);
  });

  it("rejects anything that is not a valid INTEGER id", () => {
    for (const value of [0, -3, 1.5, "abc", "", "  ", "1e3x", null, undefined, {}, 2147483648, "99999999999"]) {
      expect(parseRecipeId(value)).toBeNull();
    }
  });
});
