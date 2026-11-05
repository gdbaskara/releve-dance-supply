import { describe, expect, it } from "vitest";
import type { ProductImage } from "@/lib/contracts";
import { colorPreviews } from "@/lib/utils/image-for-color";

const img = (url: string, color?: string): ProductImage => ({ url, alt: url, color });

describe("colorPreviews", () => {
  const images = [img("a1", "Black"), img("a2", "Black"), img("b1", "Pink"), img("x")];
  it("maps each colour on sale to its first photo", () => {
    expect(colorPreviews(images, ["Black", "Pink"])).toEqual({ Black: images[0], Pink: images[2] });
  });
  it("skips colours without their own photo", () => {
    expect(colorPreviews(images, ["Black", "Sand"])).toEqual({ Black: images[0] });
  });
  it("ignores photos of colours that are not on sale", () => {
    expect(colorPreviews(images, ["Pink"])).toEqual({ Pink: images[2] });
    expect(colorPreviews([], ["Pink"])).toEqual({});
  });
});
