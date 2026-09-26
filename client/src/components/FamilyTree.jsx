import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Maximize2, Minimize2, Minus, Plus, Scan } from "lucide-react";
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

function networkOf(id, relationships) {
  const s = new Set([id]);
  for (const r of relationships) {
    if (r.relationshipType === "parent") {
      if (r.personId === id) s.add(r.relatedPersonId);
      if (r.relatedPersonId === id) s.add(r.personId);
    } else if (r.relationshipType === "spouse") {
      if (r.personId === id) s.add(r.relatedPersonId);
      if (r.relatedPersonId === id) s.add(r.personId);
    }
  }
  for (const r of relationships) {
    if (r.relationshipType === "parent" && r.personId === id) {
      for (const r2 of relationships) {
        if (r2.relationshipType === "parent" && r2.relatedPersonId === r.relatedPersonId && r2.personId !== id) {
          s.add(r2.personId);
        }
      }
    }
  }
  return s;
}

export default function FamilyTree({ people, relationships, rootId, onOpenFamily }) {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverId, setHoverId] = useState(null);
  const cardRef = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else cardRef.current?.requestFullscreen?.();
  }

  function fitToView() {
    const el = viewportRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setZoom(Math.min(1.5, Math.max(0.3, (w - 16) / tree.width)));
  }

  const zoomIn = () => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.3, +(z - 0.25).toFixed(2)));

  const tree = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const root = byId.get(rootId);
    if (!root) return null;

    const graph = buildFamilyGraph(relationships, byId);
    const parentsOf = graph.parentsOf;
    const childrenOf = graph.childrenOf;
    const spousesOf = graph.spousesOf;

    const chain = [];
    let cur = rootId;
    while (cur && chain.length < 12) {
      chain.push(cur);
      const ps = (parentsOf.get(cur) || []).filter((p) => p !== cur);
      if (!ps.length) break;
      cur = ps.find((p) => (byId.get(p) || {}).gender === "homme") || ps[0];
    }
    const pathIds = chain.length > 1 ? chain.reverse() : [];

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

    const motherLegend = [...motherStyleMap.entries()].map(([mid, style]) => ({
      id: mid,
      name: fullName(byId.get(mid)),
      border: style.border,
    }));

    return { nodes, edges, width, height, rootId, pathIds, motherLegend };
  }, [people, relationships, rootId]);

  if (!tree) return null;
  const root = people.find((p) => p.id === rootId);
  const hover = hoverId ? networkOf(hoverId, relationships) : null;
  const singleCard = tree.nodes.size === 1;

  return (
    <div ref={cardRef} className="bg-panel card-shadow border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-lg text-ink-light truncate">Arbre de {fullName(root)}</h2>
          {!singleCard && (
          <div className="flex items-center gap-0.5 ml-auto shrink-0">
            <button
              onClick={zoomOut}
              aria-label="Zoom arrière"
              title="Zoom arrière"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-light hover:bg-ink/10 transition-colors"
            >
              <Minus size={15} />
            </button>
            <span className="text-xs text-ink-muted tabular-nums w-11 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={zoomIn}
              aria-label="Zoom avant"
              title="Zoom avant"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-light hover:bg-ink/10 transition-colors"
            >
              <Plus size={15} />
            </button>
            <button
              onClick={fitToView}
              aria-label="Ajuster à l'écran"
              title="Ajuster à l'écran"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-light hover:bg-ink/10 transition-colors"
            >
              <Scan size={15} />
            </button>
            <button
              onClick={toggleFullscreen}
              aria-label="Plein écran"
              title="Plein écran"
              className="p-1.5 rounded-md text-ink-muted hover:text-ink-light hover:bg-ink/10 transition-colors"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-1.5">
          {tree.pathIds.length > 0 && (
            <nav className="flex flex-wrap items-center gap-x-1.5 text-xs" aria-label="Chemin de la famille">
              {tree.pathIds.map((id, i) => {
                const person = people.find((p) => p.id === id);
                const isCurrent = id === rootId;
                return (
                  <Fragment key={id}>
                    {i > 0 && <span className="text-ink-subtle select-none">›</span>}
                    {isCurrent ? (
                      <span className="font-medium text-accent">{fullName(person)}</span>
                    ) : (
                      <button
                        onClick={() => onOpenFamily(id)}
                        className="text-ink-muted hover:text-accent transition-colors"
                      >
                        {fullName(person)}
                      </button>
                    )}
                  </Fragment>
                );
              })}
            </nav>
          )}
          <span className="text-xs text-ink-subtle ml-auto shrink-0">Cliquez : explorer · Re-cliquez : remonter</span>
        </div>
      </div>
      {singleCard ? (
        <div className="border-t border-border">
          <div className="mx-4 my-5 border border-dashed border-border rounded-lg py-14 text-center">
            <p className="font-display text-lg text-ink-muted">Aucun lien enregistré pour {fullName(root)}</p>
            <p className="text-sm text-ink-subtle mt-1">
              Ajoutez un conjoint, des enfants ou des parents via le formulaire pour construire cet arbre.
            </p>
          </div>
        </div>
      ) : (
      <div
        className="overflow-auto"
        ref={viewportRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) setZoom(1);
        }}
      >
        <div style={{ width: tree.width * zoom, height: tree.height * zoom, minWidth: "100%", position: "relative" }}>
          <div
            className="absolute top-0 left-0"
            style={{ width: tree.width, height: tree.height, transform: `scale(${zoom})`, transformOrigin: "top left" }}
          >
          <svg className="absolute inset-0" width={tree.width} height={tree.height} aria-hidden="true">
            {tree.edges.map((e, i) => {
              const a = tree.nodes.get(e.a);
              const b = tree.nodes.get(e.b);
              if (!a || !b) return null;
              const dimEdge = hover && (!hover.has(e.a) || !hover.has(e.b));
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
                    opacity={dimEdge ? 0.12 : 1}
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
                  opacity={dimEdge ? 0.12 : 1}
                />
              );
            })}
          </svg>
          {[...tree.nodes.values()].map((n) => {
            const name = fullName(n.person);
            const deceased = !!n.person.deceased;
            const isRoot = n.id === tree.rootId;
            const dimCard = hover && !hover.has(n.id);
            return (
              <button
                key={n.id}
                onClick={() => onOpenFamily(n.id)}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  left: n.px,
                  top: n.py,
                  width: NODE_W,
                  height: NODE_H,
                  ...(n.motherStyle
                    ? { backgroundColor: n.motherStyle.tint, borderColor: n.motherStyle.border }
                    : {}),
                }}
                className={`absolute flex items-center gap-2.5 rounded-lg px-2.5 bg-panel-input text-left transition-[opacity,background-color,border-color] ${
                  dimCard ? "opacity-30" : "opacity-100"
                } ${
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
                {isRoot && tree.pathIds.length > 0 && (
                  <span
                    title="Re-cliquez pour remonter"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-panel-input flex items-center justify-center"
                  >
                    <ArrowUp size={12} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>
      )}
      {tree.motherLegend.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 border-t border-border text-[11px] text-ink-muted">
          <span className="font-mono uppercase tracking-wider text-ink-subtle">Légende</span>
          {tree.motherLegend.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: m.border }} />
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}