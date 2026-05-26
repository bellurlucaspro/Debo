/**
 * Gem Studio — Parseur de fichiers GemCAD ASCII (.asc).
 *
 * Format (extrait réel) :
 *   GemCad 5.0
 *   g 96 0.0                ← roue d'index (96 crans)
 *   I 1.54                  ← indice de réfraction de conception
 *   H PC 01.728  EIGHT NINE ← nom (1ère ligne H)
 *   a -90.0 1.0 39 33 … n G 87 …   ← rangée : angle, distance, crans d'index, nom
 *    G Set Size             ← ligne de continuation / note (commence par un espace)
 *
 * Convention d'angle GemCAD : 0 = table (dessus), ±90 = rondiste, >0 = couronne,
 * <0 = pavillon. `distance` = offset du plan (le rondiste vaut ~1).
 *
 * Pur, sans dépendance — réutilisable côté client (import admin) et serveur.
 */

import type { FacetInstruction, FacetTier } from "@/lib/gem-studio/model/design";
import type { DiagramProgram } from "@/lib/gem-studio/model/presets";

export interface ParsedAsc {
  name: string;
  gear: number;
  ior: number | null;
  program: DiagramProgram;
}

export function parseAsc(text: string): ParsedAsc {
  // 1) Regroupe les lignes de continuation (qui commencent par un espace).
  const logical: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === "") continue;
    if (/^\s/.test(raw) && logical.length > 0) {
      logical[logical.length - 1] += " " + raw.trim();
    } else {
      logical.push(raw.trim());
    }
  }

  let gear = 96;
  let ior: number | null = null;
  let name = "";
  const facets: { angle: number; distance: number; indices: number[] }[] = [];

  for (const line of logical) {
    const tokens = line.split(/\s+/);
    const head = tokens[0];

    if (head === "g") {
      const g = parseInt(tokens[1] ?? "", 10);
      if (!Number.isNaN(g) && g > 0) gear = g;
    } else if (head === "I") {
      const v = parseFloat(tokens[1] ?? "");
      if (!Number.isNaN(v)) ior = v;
    } else if (head === "H") {
      if (!name) name = tokens.slice(1).join(" ").trim();
    } else if (head === "a") {
      const angle = parseFloat(tokens[1] ?? "");
      const distance = parseFloat(tokens[2] ?? "");
      if (Number.isNaN(angle) || Number.isNaN(distance)) continue;
      const indices: number[] = [];
      for (let i = 3; i < tokens.length; i++) {
        const t = tokens[i]!;
        if (t === "n") { i++; continue; } // le token suivant est le nom de facette
        if (t === "G") break; // note (« Set Size », « Mains »…) jusqu'à la fin
        if (/^-?\d+$/.test(t)) indices.push(parseInt(t, 10));
      }
      facets.push({ angle, distance, indices });
    }
  }

  // 2) Normalise les distances pour que le rondiste vaille 1 (échelle unitaire).
  const girdle = facets.find((f) => Math.abs(f.angle) >= 89.9);
  const norm = girdle?.distance || Math.max(1e-6, ...facets.map((f) => f.distance));

  // 3) Convertit en instructions DEBO.
  let tableSeen = false;
  const instructions: FacetInstruction[] = facets.map((f) => {
    const tier = classify(f.angle, tableSeen);
    if (tier === "table") tableSeen = true;
    const depth = f.distance / norm;
    return {
      tier,
      angle: Math.abs(f.angle),
      index: f.indices[0] ?? 0,
      depth,
      repeat: f.indices.length || 1,
      indices: f.indices.length ? f.indices : undefined,
    };
  });

  return {
    name: name || "Diagramme importé",
    gear,
    ior,
    program: { instructions, scaleX: 1, scaleZ: 1, gear },
  };
}

function classify(angle: number, tableSeen: boolean): FacetTier {
  if (Math.abs(angle) >= 89.9) return "girdle";
  if (Math.abs(angle) < 0.01) return tableSeen ? "culet" : "table";
  return angle > 0 ? "crown" : "pavilion";
}
