import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { relativeLuminance } from "@/components/store/swatch-colors";

const root = process.cwd();

function walk(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p, ext) : ext.test(name) ? [p] : [];
  });
}

/** Code with comments removed, so only text that can reach the screen is checked. */
function withoutComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .map((l) => l.replace(/\s\/\/ .*$/, ""))
    .join("\n");
}

const contrast = (a: string, b: string): number => {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe("antislop guards", () => {
  it("R-02: no em dash in any message (id/en, store and admin)", () => {
    const hits = walk(join(root, "messages"), /\.json$/).filter((f) => readFileSync(f, "utf8").includes("—"));
    expect(hits.map((f) => f.replace(root, ""))).toEqual([]);
  });

  it("R-02: no em dash in UI literals of components and pages", () => {
    const hits = walk(join(root, "src"), /\.tsx$/).filter((f) => withoutComments(readFileSync(f, "utf8")).includes("—"));
    expect(hits.map((f) => f.replace(root, ""))).toEqual([]);
  });

  it("R-25: ink-subtle passes AA for small text on page and surface-alt", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    const token = (name: string) => new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css)![1];
    for (const bg of ["bg", "surface-alt"]) expect(contrast(token("ink-subtle"), token(bg)), bg).toBeGreaterThanOrEqual(4.5);
  });

  it("R-39: enabled controls get a pointer cursor from the base layer", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/button:not\(:disabled\)[^{]*\{\s*cursor:\s*pointer/);
  });

  it("antislop-code: no decorative banner comments", () => {
    const hits = walk(join(root, "src"), /\.(ts|tsx)$/).filter((f) => /(\/\*|\/\/)\s*-{4,}/.test(readFileSync(f, "utf8")));
    expect(hits.map((f) => f.replace(root, ""))).toEqual([]);
  });
});
