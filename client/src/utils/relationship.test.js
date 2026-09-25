import { buildFamilyGraph, relationshipTo } from "./relationship";

const P = (id, gender) => ({ id, firstName: id, lastName: "", gender });

function makeGraph() {
  const people = [
    P("r", "homme"), P("f", "homme"), P("m", "femme"), P("s", "homme"),
    P("c", "homme"), P("g", "homme"), P("n", "homme"), P("u", "homme"),
    P("co", "homme"), P("p", "femme"), P("pf", "homme"), P("si", "femme"),
    P("sc", "femme"), P("cw", "femme"), P("gp", "femme"), P("sa", "femme"),
    P("cof", "femme"),
  ];
  const rel = (personId, relatedPersonId, relationshipType) => ({ personId, relatedPersonId, relationshipType });
  const relationships = [
    rel("f", "r", "parent"), rel("m", "r", "parent"),
    rel("f", "s", "parent"), rel("m", "s", "parent"),
    rel("m", "sa", "parent"),
    rel("r", "c", "parent"), rel("c", "g", "parent"), rel("s", "n", "parent"),
    rel("gp", "f", "parent"), rel("gp", "u", "parent"), rel("u", "co", "parent"), rel("u", "cof", "parent"),
    rel("r", "p", "spouse"), rel("p", "r", "spouse"),
    rel("pf", "p", "parent"), rel("pf", "si", "parent"),
    rel("p", "sc", "parent"),
    rel("c", "cw", "spouse"), rel("cw", "c", "spouse"),
  ];
  const byId = new Map(people.map((p) => [p.id, p]));
  return { byId, graph: buildFamilyGraph(relationships, byId) };
}

describe("relationshipTo", () => {
  const { byId, graph } = makeGraph();
  const rel = (id) => relationshipTo("r", id, graph, byId);

  test("relates to itself", () => {
    expect(rel("r")).toEqual({ key: "self", label: "Vous" });
  });

  test("labels direct ancestors", () => {
    expect(rel("f").label).toBe("Père");
    expect(rel("m").label).toBe("Mère");
  });

  test("labels direct descendants", () => {
    expect(rel("c").label).toBe("Fils");
    expect(rel("g").label).toBe("Petit-fils");
  });

  test("labels siblings", () => {
    expect(rel("s").label).toBe("Frère");
  });

  test("labels a sibling sharing a single parent", () => {
    expect(rel("sa").label).toBe("Demi-sœur");
  });

  test("does not call siblings demi when only one parent is known", () => {
    const people = [P("rr", "homme"), P("mm", "femme"), P("aa", "femme")];
    const relationships = [
      { personId: "mm", relatedPersonId: "rr", relationshipType: "parent" },
      { personId: "mm", relatedPersonId: "aa", relationshipType: "parent" },
    ];
    const byId = new Map(people.map((p) => [p.id, p]));
    const g = buildFamilyGraph(relationships, byId);
    expect(relationshipTo("rr", "aa", g, byId).label).toBe("Sœur");
  });

  test("labels uncle and nephew", () => {
    expect(rel("u").label).toBe("Oncle");
    expect(rel("n").label).toBe("Neveu");
  });

  test("labels cousins germains", () => {
    expect(rel("co").label).toBe("Cousin germain");
  });

  test("labels spouse", () => {
    expect(rel("p").label).toBe("Conjointe");
  });

  test("labels a co-parent like a spouse", () => {
    const people = [P("r", "homme"), P("cm", "femme"), P("c", "homme")];
    const relationships = [
      { personId: "r", relatedPersonId: "c", relationshipType: "parent" },
      { personId: "cm", relatedPersonId: "c", relationshipType: "parent" },
    ];
    const byId = new Map(people.map((p) => [p.id, p]));
    const g = buildFamilyGraph(relationships, byId);
    expect(relationshipTo("r", "cm", g, byId).label).toBe("Conjointe");
  });

  test("labels in-laws", () => {
    expect(rel("pf").label).toBe("Beau-père");
    expect(rel("si").label).toBe("Belle-sœur");
    expect(rel("sc").label).toBe("Belle-fille");
    expect(rel("cw").label).toBe("Belle-fille");
  });

  test("is gender-aware", () => {
    expect(rel("co").label).toBe("Cousin germain");
    expect(rel("cof").label).toBe("Cousine germaine");
  });
});