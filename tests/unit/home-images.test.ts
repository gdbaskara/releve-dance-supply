import { describe, expect, it } from "vitest";
import { firstImageByDiscipline, pickHeroImage, pickImage } from "@/lib/services/home-images";

const img = (url: string) => ({ url, alt: url });

describe("firstImageByDiscipline", () => {
  it("takes the first product with a photo for each discipline, in catalog order", () => {
    const map = firstImageByDiscipline([
      { discipline: "Ballet", image: null },
      { discipline: "Ballet", image: img("ballet-2") },
      { discipline: "Ballet", image: img("ballet-3") },
      { discipline: "Pointe", image: img("pointe-1") },
    ]);
    expect(map).toEqual({ Ballet: img("ballet-2"), Pointe: img("pointe-1") });
  });

  it("returns an empty map when no product has a photo (reference images off)", () => {
    expect(firstImageByDiscipline([{ discipline: "Tap", image: null }])).toEqual({});
  });
});

describe("pickHeroImage", () => {
  const items = [
    { discipline: "Ballet", image: img("ballet-1") },
    { discipline: "Pointe", image: img("pointe-1") },
    { discipline: "Pointe", image: null },
    { discipline: "Pointe", image: img("pointe-3") },
  ];
  it("uses a different photo than the discipline tile (second product with a photo)", () => {
    expect(pickHeroImage(items, ["Pointe", "Ballet"])).toEqual(img("pointe-3"));
  });
  it("falls back to the only photo of the first discipline that has one", () => {
    expect(pickHeroImage(items, ["Jazz", "Ballet"])).toEqual(img("ballet-1"));
  });
  it("returns null when no listed discipline has a photo", () => {
    expect(pickHeroImage(items, ["Jazz"])).toBeNull();
  });
});

describe("pickImage", () => {
  const map = { Leotards: img("leo"), Pointe: img("pointe") };
  it("returns the first discipline in the list that has a photo", () => {
    expect(pickImage(map, ["Tights", "Leotards", "Pointe"])).toEqual(img("leo"));
  });
  it("returns null when none has a photo", () => {
    expect(pickImage(map, ["Jazz"])).toBeNull();
  });
});
