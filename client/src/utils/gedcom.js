export function buildGedcom(people, relationships) {
  const lines = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR Family Tree App");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");
  lines.push("1 SUBM @SUBM@");
  lines.push("0 @SUBM@ SUBM");
  lines.push("1 NAME Family Tree App");

  const indexOf = new Map();
  people.forEach((p, i) => indexOf.set(p.id, `I${i + 1}`));

  const famKeyToId = new Map();
  const fams = [];
  let famCount = 0;
  const byChild = new Map();
  for (const r of relationships) {
    if (r.relationshipType !== "parent") continue;
    if (!byChild.has(r.relatedPersonId)) byChild.set(r.relatedPersonId, []);
    byChild.get(r.relatedPersonId).push(r.personId);
  }
  for (const [childId, parentIds] of byChild) {
    const key = parentIds.slice().sort().join("|");
    if (!famKeyToId.has(key)) {
      famKeyToId.set(key, `F${++famCount}`);
      fams.push({ id: famKeyToId.get(key), parents: [...parentIds].sort(), children: [] });
    }
    fams.find((f) => f.id === famKeyToId.get(key)).children.push(childId);
  }

  const personFams = new Map();
  for (const f of fams) {
    for (const p of [...f.parents, ...f.children]) {
      if (!personFams.has(p)) personFams.set(p, []);
      personFams.get(p).push(f.id);
    }
  }

  for (const p of people) {
    const ref = `@${indexOf.get(p.id)}@`;
    lines.push(`0 ${ref} INDI`);
    lines.push(`1 NAME ${[p.firstName || "", `/${p.lastName || ""}/`].join(" ").replace(/\s+/g, " ").trim()}`);
    if (p.gender) {
      const sex = p.gender === "homme" ? "M" : p.gender === "femme" ? "F" : "U";
      lines.push(`1 SEX ${sex}`);
    }
    if (p.deceased) lines.push("1 DEAT Y");
    if (p.notes) {
      for (const line of String(p.notes).split("\n")) lines.push(`1 NOTE ${line}`);
    }
    for (const famId of personFams.get(p.id) || []) lines.push(`1 FAMS @${famId}@`);
  }

  const byId = new Map(people.map((p) => [p.id, p]));
  for (const f of fams) {
    lines.push(`0 @${f.id}@ FAM`);
    const parents = f.parents.map((id) => byId.get(id)).filter(Boolean);
    for (const parent of parents) {
      const tag = parent.gender === "femme" ? "WIFE" : "HUSB";
      lines.push(`1 ${tag} @${indexOf.get(parent.id)}@`);
    }
    for (const c of f.children) lines.push(`1 CHIL @${indexOf.get(c)}@`);
  }

  lines.push("0 TRLR");
  return lines.join("\n") + "\n";
}

export function downloadGedcom(text, filename = "arbre-genealogique.ged") {
  const blob = new Blob([text], { type: "application/x-gedcom;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseGedcom(text) {
  const nodes = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\s+(@[^@]+@)?\s*([A-Z0-9_]+)\s*(.*)$/);
    if (!m) continue;
    nodes.push({ level: +m[1], xref: m[2] || "", tag: m[3], value: m[4] || "" });
  }

  const indi = new Map();
  const fams = [];
  let i = 0;
  while (i < nodes.length) {
    if (nodes[i].level !== 0) {
      i++;
      continue;
    }
    const rec = nodes[i];
    if (rec.tag === "INDI") {
      const person = { xref: rec.xref, firstName: "", lastName: "", gender: "", deceased: false, notes: "" };
      let j = i + 1;
      while (j < nodes.length && nodes[j].level > 0) {
        const n = nodes[j];
        if (n.tag === "NAME" && n.level === 1) {
          const nm = n.value.match(/^(.*?)\/(.*?)\/(.*)$/);
          if (nm) {
            person.firstName = `${nm[1]} ${nm[3] || ""}`.replace(/\s+/g, " ").trim();
            person.lastName = nm[2].trim();
          } else {
            person.firstName = n.value.trim();
          }
        } else if (n.tag === "SEX" && n.level === 1) {
          const s = n.value.trim().toUpperCase();
          person.gender = s === "M" ? "homme" : s === "F" ? "femme" : "autre";
        } else if (n.tag === "DEAT" && n.level === 1) {
          person.deceased = true;
        } else if (n.tag === "NOTE" && n.level === 1) {
          person.notes = n.value;
        }
        j++;
      }
      indi.set(rec.xref, person);
      i = j;
    } else if (rec.tag === "FAM") {
      const fam = { husb: "", wife: "", chil: [] };
      let j = i + 1;
      while (j < nodes.length && nodes[j].level > 0) {
        const n = nodes[j];
        if (n.tag === "HUSB" && n.level === 1) fam.husb = n.value.replace(/@/g, "");
        else if (n.tag === "WIFE" && n.level === 1) fam.wife = n.value.replace(/@/g, "");
        else if (n.tag === "CHIL" && n.level === 1) fam.chil.push(n.value.replace(/@/g, ""));
        j++;
      }
      fams.push(fam);
      i = j;
    } else {
      i++;
    }
  }
  return { people: [...indi.values()], fams };
}
