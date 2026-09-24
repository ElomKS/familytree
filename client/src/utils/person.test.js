import { fullName, normalizeName, initialsOf, avatarColor, formatDates, genderLabel } from "./person";

describe("fullName", () => {
  test("combines first and last name", () => {
    expect(fullName({ firstName: "Marie", lastName: "Curie" })).toBe("Marie Curie");
  });

  test("works without a last name", () => {
    expect(fullName({ firstName: "Marie", lastName: "" })).toBe("Marie");
  });

  test("collapses extra whitespace", () => {
    expect(fullName({ firstName: "  Marie ", lastName: "  Curie" })).toBe("Marie Curie");
  });
});

describe("normalizeName", () => {
  test("lowercases and trims", () => {
    expect(normalizeName("  Marie  Curie ")).toBe("marie curie");
  });
});

describe("initialsOf", () => {
  test("returns first letters of both names", () => {
    expect(initialsOf("Marie", "Curie")).toBe("MC");
  });

  test("falls back to a single initial", () => {
    expect(initialsOf("Marie", "")).toBe("M");
  });

  test("returns ? when nothing is given", () => {
    expect(initialsOf("", "")).toBe("?");
  });
});

describe("avatarColor", () => {
  test("is deterministic for the same name", () => {
    expect(avatarColor("Marie Curie")).toBe(avatarColor("Marie Curie"));
  });

  test("returns one of the known palette colors", () => {
    const colors = ["bg-[#C1584C]", "bg-[#C79A56]", "bg-[#6B9A78]", "bg-[#5A7FB5]", "bg-[#8B6BAF]", "bg-[#B5854A]"];
    expect(colors).toContain(avatarColor("Ada Lovelace"));
  });
});

describe("formatDates", () => {
  test("formats birth and death years", () => {
    expect(formatDates("1867-11-07", "1934-07-04", true)).toBe("1867 – 1934");
  });

  test("formats birth only", () => {
    expect(formatDates("1867-11-07", null, false)).toBe("né(e) 1867");
  });

  test("formats death only", () => {
    expect(formatDates(null, "1934-07-04", true)).toBe("† 1934");
  });

  test("shows deceased without a death year", () => {
    expect(formatDates(null, null, true)).toBe("Décédé(e)");
  });

  test("returns empty string when nothing is known", () => {
    expect(formatDates(null, null, false)).toBe("");
  });
});

describe("genderLabel", () => {
  test("maps known genders", () => {
    expect(genderLabel("homme")).toBe("Homme");
    expect(genderLabel("femme")).toBe("Femme");
  });

  test("passes through unknown values as Autre", () => {
    expect(genderLabel("autre")).toBe("Autre");
  });

  test("returns empty for missing gender", () => {
    expect(genderLabel("")).toBe("");
  });
});