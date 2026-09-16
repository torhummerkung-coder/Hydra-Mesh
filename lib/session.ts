import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "hydra_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h — เพิ่ม refresh token ทีหลังได้
export const SESSION_ROLES = ["patient", "doctor", "admin", "staff", "security"] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];

export function isSessionRole(value: unknown): value is SessionRole {
  return typeof value === "string" && (SESSION_ROLES as readonly string[]).includes(value);
}

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ต้องตั้งค่าใน env และยาวอย่างน้อย 32 ตัวอักษร");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id (ผู้ป่วย, แพทย์/staff, หรือทีม security)
  role: SessionRole;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !isSessionRole(payload.role)) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null; // signature ผิด, หมดอายุ, หรือ malformed
  }
}
