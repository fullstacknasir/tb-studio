export type JwtPayload = { exp: number; sub?: string };

export function decodeJwt(token: string): JwtPayload {
  if (!token) throw new Error("Missing token");
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error("Invalid JWT");
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const jsonPayload = Buffer.from(padded, 'base64').toString('utf8');
  const payload = JSON.parse(jsonPayload) as JwtPayload;
  if (!payload || typeof payload.exp !== "number") throw new Error("Invalid JWT payload");
  return payload;
}

export function safeDecodeJwt(token: string): JwtPayload | null {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}
