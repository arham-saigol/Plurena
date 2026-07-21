import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

describe("buttonVariants", () => {
  it.each(["outline", "ghost"] as const)(
    "keeps text readable when the %s hover background changes",
    (variant) => {
      expect(buttonVariants({ variant })).toContain(
        "hover:text-accent-foreground",
      );
    },
  );
});
