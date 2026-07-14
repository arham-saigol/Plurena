import { describe, expect, it } from "vitest";
import { validatedAppOrigin, validatedCheckoutUrl } from "@/lib/checkout-security";

describe("checkout URL boundaries", () => {
  it("requires an HTTPS canonical origin in production", () => {
    expect(validatedAppOrigin("http://localhost:3000/api/checkout", "https://plurena.example/path", true)).toBe("https://plurena.example");
    expect(() => validatedAppOrigin("http://localhost:3000/api/checkout", undefined, true)).toThrow();
    expect(() => validatedAppOrigin("https://plurena.example/api/checkout", "http://plurena.example", true)).toThrow();
  });

  it("accepts only Creem HTTPS checkout hosts", () => {
    expect(validatedCheckoutUrl("https://checkout.creem.io/ch_123")).toBe("https://checkout.creem.io/ch_123");
    expect(() => validatedCheckoutUrl("https://evil.example/ch_123")).toThrow();
    expect(() => validatedCheckoutUrl("http://checkout.creem.io/ch_123")).toThrow();
  });
});
