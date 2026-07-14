export function validatedAppOrigin(requestUrl: string, configured: string | undefined, production: boolean) {
  if (!configured && production) throw new Error("NEXT_PUBLIC_APP_URL is required in production.");
  const url = new URL(configured ?? new URL(requestUrl).origin);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(!production && local)) throw new Error("Invalid application URL.");
  return url.origin;
}

export function validatedCheckoutUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || (url.hostname !== "checkout.creem.io" && !url.hostname.endsWith(".checkout.creem.io"))) {
    throw new Error("Creem returned an untrusted checkout URL.");
  }
  return url.toString();
}
