import crypto from "crypto";

export function verifyHmac(raw: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  let sig = signature;
  if (sig.startsWith("sha256=")) sig = sig.slice(7);
  const digest = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  try {
    const a = Buffer.from(digest, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}


