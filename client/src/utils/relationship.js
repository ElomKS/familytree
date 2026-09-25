function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}

export function buildFamilyGraph(relationships, byId) {
  const parentsOf = new Map();
  const childrenOf = new Map();
  const spousesOf = new Map();
  for (const r of relationships) {
    if (!byId.has(r.personId) || !byId.has(r.relatedPersonId)) continue;
    if (r.relationshipType === "parent") {
      push(parentsOf, r.relatedPersonId, r.personId);
      push(childrenOf, r.personId, r.relatedPersonId);
    } else if (r.relationshipType === "spouse") {
      push(spousesOf, r.personId, r.relatedPersonId);
      push(spousesOf, r.relatedPersonId, r.personId);
    }
  }
  return { parentsOf, childrenOf, spousesOf };
}

function ancestorDepths(parentsOf, id) {
  const depths = new Map();
  const queue = [[id, 0]];
  while (queue.length) {
    const [cur, d] = queue.shift();
    for (const p of parentsOf.get(cur) || []) {
      if (!depths.has(p)) {
        depths.set(p, d + 1);
        queue.push([p, d + 1]);
      }
    }
  }
  return depths;
}

function descendantDepths(childrenOf, id) {
  const depths = new Map();
  const queue = [[id, 0]];
  while (queue.length) {
    const [cur, d] = queue.shift();
    for (const c of childrenOf.get(cur) || []) {
      if (!depths.has(c)) {
        depths.set(c, d + 1);
        queue.push([c, d + 1]);
      }
    }
  }
  return depths;
}

function findLCA(parentsOf, a, b) {
  const depthsA = ancestorDepths(parentsOf, a);
  if (depthsA.has(b)) return { lca: b, a: depthsA.get(b), b: 0 };
  const seen = new Map([[b, 0]]);
  const queue = [[b, 0]];
  let best = null;
  while (queue.length) {
    const [cur, d] = queue.shift();
    if (depthsA.has(cur)) {
      const score = depthsA.get(cur) + d;
      if (!best || score < best.score) best = { lca: cur, a: depthsA.get(cur), b: d, score };
    }
    for (const p of parentsOf.get(cur) || []) {
      if (!seen.has(p)) {
        seen.set(p, d + 1);
        queue.push([p, d + 1]);
      }
    }
  }
  return best;
}

function collateralLabel(a, b, gender) {
  const t = (m, f) => (gender === "femme" ? f : m);
  if (a === 1 && b === 1) return t("Frère", "Sœur");
  if (a === 1 && b === 2) return t("Neveu", "Nièce");
  if (a === 1 && b === 3) return t("Petit-neveu", "Petite-nièce");
  if (a === 2 && b === 1) return t("Oncle", "Tante");
  if (a === 3 && b === 1) return t("Grand-oncle", "Grand-tante");
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (min === 2 && max === 2) return t("Cousin germain", "Cousine germaine");
  if (min === 2 && max === 3) return t("Cousin au premier degré", "Cousine au premier degré");
  if (min === 3 && max === 3) return t("Cousin issu de germain", "Cousine issue de germain");
  return t("Cousin éloigné", "Cousine éloignée");
}

function inLawLabel(rootId, personId, graph, gender) {
  const { parentsOf, childrenOf, spousesOf } = graph;
  const t = (m, f) => (gender === "femme" ? f : m);
  const isParentOf = (a, b) => (parentsOf.get(b) || []).includes(a);
  const sharesParent = (x, y) => (parentsOf.get(x) || []).some((p) => isParentOf(p, y));

  const spouses = spousesOf.get(rootId) || [];
  for (const sp of spouses) {
    if (sp === personId) continue;
    if (isParentOf(personId, sp)) return t("Beau-père", "Belle-mère");
    if (sharesParent(sp, personId) && !sharesParent(rootId, personId)) return t("Beau-frère", "Belle-sœur");
    if ((childrenOf.get(sp) || []).includes(personId) && !(childrenOf.get(rootId) || []).includes(personId)) {
      return t("Beau-fils", "Belle-fille");
    }
  }

  for (const c of childrenOf.get(rootId) || []) {
    if ((spousesOf.get(c) || []).includes(personId)) return t("Gendre", "Belle-fille");
  }

  const parents = parentsOf.get(rootId) || [];
  const siblingIds = new Set();
  for (const p of parents) {
    for (const sib of childrenOf.get(p) || []) {
      if (sib !== rootId) siblingIds.add(sib);
    }
  }
  for (const sib of siblingIds) {
    if ((spousesOf.get(sib) || []).includes(personId)) return t("Beau-frère", "Belle-sœur");
  }
  for (const p of parents) {
    for (const sp of spousesOf.get(p) || []) {
      if (sp !== p && !parents.includes(sp) && sp === personId) return t("Beau-père", "Belle-mère");
    }
  }

  return null;
}

export function relationshipTo(rootId, personId, graph, peopleById) {
  if (rootId === personId) return { key: "self", label: "Vous" };
  const person = peopleById.get(personId);
  const gender = person?.gender || "";
  const { parentsOf, childrenOf, spousesOf } = graph;
  const t = (m, f) => (gender === "femme" ? f : m);

  if ((spousesOf.get(rootId) || []).includes(personId)) {
    return { key: "spouse", label: t("Conjoint", "Conjointe") };
  }

  const sharesChild = (x, y) =>
    (childrenOf.get(x) || []).some((c) => (parentsOf.get(c) || []).includes(y));
  if (sharesChild(rootId, personId)) {
    return { key: "partner", label: t("Conjoint", "Conjointe") };
  }

  const anc = ancestorDepths(parentsOf, rootId);
  if (anc.has(personId)) {
    const d = anc.get(personId);
    if (d === 1) return { key: "parent", label: t("Père", "Mère") };
    if (d === 2) return { key: "grandparent", label: t("Grand-père", "Grand-mère") };
    if (d === 3) return { key: "great-grandparent", label: t("Arrière-grand-père", "Arrière-grand-mère") };
    return { key: "ancestor", label: "Ancêtre" };
  }

  const desc = descendantDepths(childrenOf, rootId);
  if (desc.has(personId)) {
    const d = desc.get(personId);
    if (d === 1) return { key: "child", label: t("Fils", "Fille") };
    if (d === 2) return { key: "grandchild", label: t("Petit-fils", "Petite-fille") };
    if (d === 3) return { key: "great-grandchild", label: t("Arrière-petit-fils", "Arrière-petite-fille") };
    return { key: "descendant", label: "Descendant" };
  }

  const lca = findLCA(parentsOf, rootId, personId);
  if (lca && lca.b > 0) {
    if (lca.a === 1 && lca.b === 1) {
      const shared = (parentsOf.get(rootId) || []).filter((p) =>
        (parentsOf.get(personId) || []).includes(p)
      );
      const demi =
        shared.length === 1 &&
        ((parentsOf.get(rootId) || []).length > 1 || (parentsOf.get(personId) || []).length > 1);
      return { key: "collateral", label: demi ? t("Demi-frère", "Demi-sœur") : t("Frère", "Sœur") };
    }
    return { key: "collateral", label: collateralLabel(lca.a, lca.b, gender) };
  }

  const inLaw = inLawLabel(rootId, personId, graph, gender);
  if (inLaw) return { key: "inlaw", label: inLaw };
  return null;
}