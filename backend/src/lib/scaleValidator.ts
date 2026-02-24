import { NodeIO, type Document } from "@gltf-transform/core";
import fs from "node:fs";
import path from "node:path";

export type ScaleValidationInput = {
  file: string; // ruta local o URL https
  width?: number; // cm
  depth?: number; // cm
  height?: number; // cm
  tolerance?: number; // fracción, ej 0.05 = 5%
};

export type ScaleValidationResult = {
  sizeCm: { width: number; depth: number; height: number };
  expected: { width?: number; depth?: number; height?: number };
  tolerance: number;
  diffs: { width: number | null; depth: number | null; height: number | null };
  ok: boolean;
};

async function loadBuffer(file: string): Promise<Buffer> {
  if (file.startsWith("http://") || file.startsWith("https://")) {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`No se pudo descargar ${file}: ${res.status} ${res.statusText}`);
    const arr = new Uint8Array(await res.arrayBuffer());
    return Buffer.from(arr);
  }
  const resolved = path.resolve(process.cwd(), file);
  return fs.promises.readFile(resolved);
}

function computeBBox(doc: Document) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const arr = pos.getArray();
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        const x = arr[i];
        const y = arr[i + 1];
        const z = arr[i + 2];
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x > max[0]) max[0] = x;
        if (y > max[1]) max[1] = y;
        if (z > max[2]) max[2] = z;
      }
    }
  }
  return { min, max };
}

const formatCm = (meters: number) => Math.round(meters * 1000) / 10;
const percentDiff = (expected: number, actual: number) => (expected ? Math.abs(actual - expected) / expected : null);

export async function validateGlbScale(input: ScaleValidationInput): Promise<ScaleValidationResult> {
  const { file, width, depth, height, tolerance = 0.05 } = input;
  if (!file) throw new Error("Falta file");
  if (!width && !depth && !height) throw new Error("Falta al menos una dimensión esperada");

  const io = new NodeIO();
  const buffer = await loadBuffer(file);
  const doc = await io.readBinary(buffer);
  const { min, max } = computeBBox(doc);
  const sizeMeters = {
    width: max[0] - min[0],
    height: max[1] - min[1],
    depth: max[2] - min[2],
  };
  const sizeCm = {
    width: formatCm(sizeMeters.width),
    height: formatCm(sizeMeters.height),
    depth: formatCm(sizeMeters.depth),
  };

  const diffs = {
    width: width ? percentDiff(width, sizeCm.width) : null,
    depth: depth ? percentDiff(depth, sizeCm.depth) : null,
    height: height ? percentDiff(height, sizeCm.height) : null,
  };

  let ok = true;
  for (const key of ["width", "depth", "height"] as const) {
    const diff = diffs[key];
    if (diff !== null && diff > tolerance) ok = false;
  }

  return { sizeCm, expected: { width, depth, height }, tolerance, diffs, ok };
}
