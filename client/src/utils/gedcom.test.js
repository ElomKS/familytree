import { buildGedcom, parseGedcom } from "./gedcom";

describe("buildGedcom", () => {
  test("emits header and trailer", () => {
    const text = buildGedcom([], []);
    expect(text).toContain("0 HEAD");
    expect(text).toContain("0 TRLR");
  });

  test("writes individual records with names, sex and death", () => {
    const people = [{ id: "p1", firstName: "Marie", lastName: "Curie", gender: "femme", deceased: true, notes: "" }];
    const text = buildGedcom(people, []);
    expect(text).toContain("0 @I1@ INDI");
    expect(text).toContain("1 NAME Marie /Curie/");
    expect(text).toContain("1 SEX F");
    expect(text).toContain("1 DEAT Y");
  });

  test("groups parents into a family record and links the child", () => {
    const people = [
      { id: "dad", firstName: "Pierre", lastName: "Curie", gender: "homme" },
      { id: "mom", firstName: "Marie", lastName: "Curie", gender: "femme" },
      { id: "child", firstName: "Irène", lastName: "Curie", gender: "femme" },
    ];
    const rels = [
      { personId: "dad", relatedPersonId: "child", relationshipType: "parent" },
      { personId: "mom", relatedPersonId: "child", relationshipType: "parent" },
      { personId: "dad", relatedPersonId: "mom", relationshipType: "spouse" },
    ];
    const text = buildGedcom(people, rels);
    expect(text).toContain("0 @F1@ FAM");
    expect(text).toContain("1 HUSB @I1@");
    expect(text).toContain("1 WIFE @I2@");
    expect(text).toContain("1 CHIL @I3@");
  });
});

describe("parseGedcom", () => {
  const sample = [
    "0 HEAD",
    "0 @I1@ INDI",
    "1 NAME Marie /Curie/",
    "1 SEX F",
    "1 DEAT Y",
    "0 @I2@ INDI",
    "1 NAME Pierre /Curie/",
    "1 SEX M",
    "0 @F1@ FAM",
    "1 HUSB @I2@",
    "1 WIFE @I1@",
    "1 CHIL @I3@",
    "0 @I3@ INDI",
    "1 NAME Irène /Curie/",
    "0 TRLR",
  ].join("\n");

  test("parses individuals and families", () => {
    const { people, fams } = parseGedcom(sample);
    expect(people).toHaveLength(3);
    const marie = people.find((p) => p.firstName === "Marie" && p.lastName === "Curie");
    expect(marie.gender).toBe("femme");
    expect(marie.deceased).toBe(true);
    expect(fams).toHaveLength(1);
    expect(fams[0].husb).toBe("I2");
    expect(fams[0].wife).toBe("I1");
    expect(fams[0].chil).toContain("I3");
  });

  test("round-trips build -> parse", () => {
    const people = [
      { id: "a", firstName: "Ada", lastName: "Lovelace", gender: "femme", deceased: true, notes: "mathématicienne" },
      { id: "b", firstName: "Byron", lastName: "King", gender: "homme", deceased: false, notes: "" },
    ];
    const text = buildGedcom(people, []);
    const { people: parsed } = parseGedcom(text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].firstName).toBe("Ada");
    expect(parsed[0].lastName).toBe("Lovelace");
    expect(parsed[0].deceased).toBe(true);
    expect(parsed[1].firstName).toBe("Byron");
  });
});