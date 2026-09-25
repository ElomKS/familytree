import { useMemo } from "react";
import { fullName } from "../utils/person";
import { buildFamilyGraph, relationshipTo } from "../utils/relationship";
import Avatar from "./Avatar";

const NODE_W = 180;
const NODE_H = 82;
const GAP_X = 18;
const GAP_Y = 80;
const PAD = 24;
const MAX_UP = 3;
const MAX_DOWN = 3;

const MOTHER_COLORS = [
  { border: "#45C46C", tint: "rgba(69,196,108,0.16)" },
  { border: "#3E9BFF", tint: "rgba(62,155,255,0.16)" },
  { border: "#E5484D", tint: "rgba(229,72,77,0.16)" },
  { border: "#B86CF5", tint: "rgba(184,108,245,0.16)" },
  { border: "#F5A623", tint: "rgba(245,166,35,0.16)" },
  { border: "#F560B7", tint: "rgba(245,96,183,0.16)" },
];

export default function FamilyTree({ people, relationships, rootId, onOpenFamily }) {
  const tree = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const root = byId.get(rootId);
    if (!root) return null;

    const graph = buildFamilyGraph(relationships, byId);
    const parentsOf = graph.parentsOf;
    const childrenOf = graph.childrenOf;
    const spousesOf = graph.spousesOf;

    const nodes = new Map();
    const getNode = (id, level) => {
      if (!nodes.has(id)) nodes.set(id, { id, person: byId.get(id), x: null, level });
      return nodes.get(id);
    };
    const siblingIds = new Set();
    for (const pid of parentsOf.get(rootId) || []) {
      for (const cid of childrenOf.get(pid) || []) {
        if (cid !== rootId) siblingIds.add(cid);
      }
    }
    const siblings = [...siblingIds].sort((a, b) =>
      fullName(byId.get(a)).localeCompare(fullName(byId.get(b)))
    );

    const parentsOfRoot = new Set(parentsOf.get(rootId) || []);
    const partnerIdSet = new Set();
    for (const s of spousesOf.get(rootId) || []) {
      if (s !== rootId && !parentsOfRoot.has(s) && !siblingIds.has(s)) partnerIdSet.add(s);
    }
    for (const kid of childrenOf.get(rootId) || []) {
      for (const par of parentsOf.get(kid) || []) {
        if (par !== rootId && !parentsOfRoot.has(par) && !siblingIds.has(par)) partnerIdSet.add(par);
      }
    }
    const rootPartners = [...partnerIdSet].slice(0, 2);
    const leftPartners = rootPartners.slice(0, Math.ceil(rootPartners.length / 2));
    const rightPartners = rootPartners.slice(leftPartners.length);

    let rowItems;
    if (siblings.length) {
      const clusters = new Map();
      for (const s of [...siblings, rootId]) {
        const key = (parentsOf.get(s) || []).filter((p) => p !== s).slice().sort().join("|");
        if (!clusters.has(key)) clusters.set(key, []);
        clusters.get(key).push(s);
      }
      const flat = [...clusters.values()]
        .sort((a, b) => fullName(byId.get(a[0])).localeCompare(fullName(byId.get(b[0]))))
        .flat();
      const rootAt = flat.indexOf(rootId);
      rowItems = [
        ...flat.slice(0, rootAt),
        ...leftPartners,
        rootId,
        ...rightPartners,
        ...flat.slice(rootAt + 1),
      ];
    } else {
      rowItems = [...leftPartners, rootId, ...rightPartners];
    }
    const rowW = rowItems.length * NODE_W + (rowItems.length - 1) * GAP_X;
    rowItems.forEach((id, i) => {
      getNode(id, 0).x = -rowW / 2 + i * (NODE_W + GAP_X);
    });

    const anchorCenter = (partnerId) => {
      const rn = nodes.get(rootId);
      if (!partnerId) return rn.x + NODE_W / 2;
      return (nodes.get(partnerId).x + rn.x) / 2 + NODE_W / 2;
    };

    function layoutUp(id, depth, centerX) {
      if (depth >= MAX_UP) return;
      const n = nodes.get(id);
      const parents = (parentsOf.get(id) || []).filter((pid) => pid !== id).slice(0, 2);
      if (!parents.length) return;
      const cx = centerX ?? n.x + NODE_W / 2;
      const groupW = parents.length * NODE_W + (parents.length - 1) * GAP_X;
      const startX = cx - groupW / 2;
      parents.forEach((pid, i) => {
        if (nodes.has(pid) && nodes.get(pid).x !== null) return;
        const pn = getNode(pid, n.level - 1);
        pn.x = startX + i * (NODE_W + GAP_X);
        layoutUp(pid, depth + 1);
      });
    }

    function layoutDown(id, depth) {
      if (depth >= MAX_DOWN) return;
      const n = nodes.get(id);
      const kids = (childrenOf.get(id) || []).filter((kid) => kid !== id).slice(0, 8);
      if (!kids.length) return;

      if (depth === 0 && rootPartners.length) {
        const groups = new Map();
        for (const kid of kids) {
          const p = rootPartners.find((pid) => (parentsOf.get(kid) || []).includes(pid)) || "";
          if (!groups.has(p)) groups.set(p, []);
          groups.get(p).push(kid);
        }
        const endXs = [];
        [...groups.entries()]
          .sort(([pA], [pB]) => anchorCenter(pA) - anchorCenter(pB))
          .forEach(([p, gkids]) => {
            const gW = gkids.length * NODE_W + (gkids.length - 1) * GAP_X;
            let startX = anchorCenter(p) - gW / 2;
            if (endXs.length) startX = Math.max(startX, endXs[endXs.length - 1] + GAP_X);
            gkids.forEach((kid, i) => {
              getNode(kid, n.level + 1).x = startX + i * (NODE_W + GAP_X);
            });
            endXs.push(startX + gW);
          });
        return;
      }

      const totalCards = kids.length;
      const groupW = totalCards * NODE_W + (totalCards - 1) * GAP_X;
      const startX = n.x + NODE_W / 2 - groupW / 2;
      kids.forEach((kid, i) => {
        getNode(kid, n.level + 1).x = startX + i * (NODE_W + GAP_X);
      });
    }

    const rowIds = new Set(rowItems);
    const parentCands = [];
    const seenParent = new Set();
    for (const rid of rowItems) {
      for (const par of parentsOf.get(rid) || []) {
        if (par === rid || rowIds.has(par) || seenParent.has(par)) continue;
        seenParent.add(par);
        parentCands.push(par);
      }
    }
    const placedParents = parentCands.slice(0, 4);
    if (placedParents.length) {
      const spans = placedParents.map((pid) => {
        const xsP = rowItems
          .filter((rid) => (childrenOf.get(pid) || []).includes(rid))
          .map((rid) => nodes.get(rid).x);
        const center = (Math.min(...xsP) + Math.max(...xsP)) / 2 + NODE_W / 2;
        return { pid, center };
      });
      spans.sort(
        (a, b) => a.center - b.center || fullName(byId.get(a.pid)).localeCompare(fullName(byId.get(b.pid)))
      );
      const endXs = [];
      for (const { pid, center } of spans) {
        let x = center - NODE_W / 2;
        if (endXs.length) x = Math.max(x, endXs[endXs.length - 1] + GAP_X);
        getNode(pid, -1).x = x;
        endXs.push(x + NODE_W);
      }
      for (const pid of placedParents) {
        if (parentsOfRoot.has(pid) && nodes.get(pid).x !== null) layoutUp(pid, 0);
      }
    }
    layoutDown(rootId, 0);

    const edges = [];
    const initial = [...nodes.keys()];
    for (const id of initial) {
      const n = nodes.get(id);
      if (!n || id !== rootId) continue;
      const spouses = (spousesOf.get(id) || []).filter((s) => s !== id).slice(0, 1);
      for (const s of spouses) {
        const existing = nodes.get(s);
        if (existing && existing.x !== null) {
          if (n.x < existing.x) edges.push({ a: id, b: s, kind: "spouse" });
          else edges.push({ a: s, b: id, kind: "spouse" });
          continue;
        }
        const targetX = n.x + NODE_W + GAP_X;
        const occupied = [...nodes.values()].some(
          (m) => m !== n && m.level === n.level && m.x === targetX
        );
        if (occupied) continue;
        const sn = getNode(s, n.level);
        sn.x = targetX;
        edges.push({ a: id, b: s, kind: "spouse" });
      }
    }

    for (const r of relationships) {
      if (r.relationshipType !== "parent") continue;
      const pa = nodes.get(r.personId);
      const ch = nodes.get(r.relatedPersonId);
      if (!pa || !ch || pa.x === null || ch.x === null || pa.level === ch.level) continue;
      edges.push({ a: r.personId, b: r.relatedPersonId, kind: "parent" });
    }

    const placed = [...nodes.values()];
    const minX = Math.min(...placed.map((m) => m.x));
    const maxX = Math.max(...placed.map((m) => m.x));
    const minLevel = Math.min(...placed.map((m) => m.level));
    const maxLevel = Math.max(...placed.map((m) => m.level));
    for (const m of placed) {
      m.px = m.x - minX + PAD;
      m.py = (m.level - minLevel) * (NODE_H + GAP_Y) + PAD;
      const rel = relationshipTo(rootId, m.id, graph, byId);
      m.relation = rel ? rel.label : "";
    }
    const motherStyleMap = new Map();
    {
      const mothers = new Set();
      for (const m of placed) {
        for (const pid of parentsOf.get(m.id) || []) {
          if ((byId.get(pid) || {}).gender === "femme") mothers.add(pid);
        }
      }
      const sorted = [...mothers].sort((a, b) =>
        fullName(byId.get(a)).localeCompare(fullName(byId.get(b)))
      );
      sorted.forEach((mid, i) => motherStyleMap.set(mid, MOTHER_COLORS[i % MOTHER_COLORS.length]));
      for (const m of placed) {
        for (const pid of parentsOf.get(m.id) || []) {
          if (motherStyleMap.has(pid)) {
            m.motherStyle = motherStyleMap.get(pid);
            break;
          }
        }
      }
      for (const [mid, style] of motherStyleMap) {
        const mom = nodes.get(mid);
        if (mom && !mom.motherStyle) mom.motherStyle = style;
      }
    }
    const width = maxX - minX + NODE_W + PAD * 2;
    const height = (maxLevel - minLevel + 1) * NODE_H + (maxLevel - minLevel) * GAP_Y + PAD * 2;

    return { nodes, edges, width, height, rootId };
  }, [people, relationships, rootId]);

  if (!tree) return null;
  const root = people.find((p) => p.id === rootId);

  return (
    <div className="bg-panel card-shadow border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <h2 className="font-display text-lg text-ink-light truncate">Arbre de {fullName(root)}</h2>
        <span className="text-xs text-ink-muted ml-auto shrink-0">3 générations · navigatez en cliquant</span>
      </div>
      <div className="overflow-auto">
        <div className="relative" style={{ width: tree.width, height: tree.height, minWidth: "100%" }}>
          <svg className="absolute inset-0" width={tree.width} height={tree.height} aria-hidden="true">
            {tree.edges.map((e, i) => {
              const a = tree.nodes.get(e.a);
              const b = tree.nodes.get(e.b);
              if (!a || !b) return null;
              if (e.kind === "parent") {
                const ax = a.px + NODE_W / 2;
                const ay = a.py + NODE_H;
                const bx = b.px + NODE_W / 2;
                const by = b.py;
                const midY = (ay + by) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${ax} ${ay} V ${midY} H ${bx} V ${by}`}
                    fill="none"
                    stroke="#454F68"
                    strokeWidth={1.5}
                  />
                );
              }
              const left = a.px < b.px ? a : b;
              const right = left === a ? b : a;
              const y = left.py + NODE_H * 0.55;
              return (
                <path
                  key={`s${i}`}
                  d={`M ${left.px + NODE_W} ${y} H ${right.px}`}
                  fill="none"
                  stroke="#C79A56"
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>
          {[...tree.nodes.values()].map((n) => {
            const name = fullName(n.person);
            const deceased = !!n.person.deceased;
            const isRoot = n.id === tree.rootId;
            return (
              <button
                key={n.id}
                onClick={() => onOpenFamily(n.id)}
                style={{
                  left: n.px,
                  top: n.py,
                  width: NODE_W,
                  height: NODE_H,
                  ...(n.motherStyle
                    ? { backgroundColor: n.motherStyle.tint, borderColor: n.motherStyle.border }
                    : {}),
                }}
                className={`absolute flex items-center gap-2.5 rounded-lg px-2.5 bg-panel-input text-left transition-colors ${
                  isRoot
                    ? "border-2 border-accent ring-1 ring-accent/50"
                    : n.motherStyle
                      ? "border-2 border-transparent"
                      : "border border-border hover:border-border-hover"
                }`}
              >
                <Avatar person={n.person} size="w-7 h-7" textSize="text-[11px]" />
                <span className="min-w-0 flex-1 text-left">
                  <span className={`block text-[13px] font-medium leading-snug line-clamp-2 ${deceased ? "text-ink-muted line-through" : "text-ink-light"}`}>
                    {name}
                  </span>
                  <span className={`block text-[11px] uppercase tracking-wide truncate ${isRoot ? "text-accent" : "text-ink-subtle"}`}>
                    {n.relation}
                  </span>
                </span>
                {n.motherStyle && (
                  <span
                    className="shrink-0 rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: n.motherStyle.border }}
                  />
                )}
                {deceased && <span className="text-xs text-ink-subtle shrink-0">†</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}