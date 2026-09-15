export interface HydraShard {
  shardIndex: number;
  totalShards: number;
  cipherMode: string;
  sessionId: string;
  masterSalt: string;
  shardSalt: string;
  iv: string;
  ciphertext: string;
  createdAt: number;
  // hmacKey / hmacTag ไม่มีในเวอร์ชันนี้ — integrity มาจาก AES-GCM tag
  // ที่ผูกกับ metadata ผ่าน AAD แทน (ดู shardAad ด้านล่าง) แก้ field ไหนก็ตาม
  // decrypt จะ fail ทันทีโดยไม่ต้องมี key แยกให้จัดการ
}

export interface HydraEncryptResult {
  shards: HydraShard[];
  sessionId: string;
  cipherMode: string;
  numShards: number;
  createdAt: number;
}

export interface HydraDecryptResult {
  plaintext: string;
  sessionId: string;
  verifiedShards: number;
}

const CIPHER_MODE = "AES-256-GCM" as const;

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function toB64(u8: Uint8Array): string {
  if (typeof window !== "undefined") {
    return btoa(String.fromCharCode(...u8))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  return Buffer.from(u8).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromB64(s: string): Uint8Array {
  let padded = s.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  if (typeof window !== "undefined") {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function pbkdf2DeriveKey(
  password: string,
  salt: Uint8Array,
  iterations = 310_000
): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-512" },
    km,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function hkdfExpandKey(
  masterKeyBytes: Uint8Array,
  info: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const km = await crypto.subtle.importKey("raw", masterKeyBytes, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-512", salt, info: new TextEncoder().encode(info) },
    km,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function aesGcmEncrypt(
  key: CryptoKey,
  data: Uint8Array,
  aad?: Uint8Array
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128, ...(aad ? { additionalData: aad } : {}) },
    key,
    data
  );
  return { iv, ciphertext: new Uint8Array(ct) };
}

async function aesGcmDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  aad?: Uint8Array
): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128, ...(aad ? { additionalData: aad } : {}) },
    key,
    ciphertext
  );
  return new Uint8Array(plain);
}

// ผูก metadata ของ shard เข้ากับ ciphertext ผ่าน AES-GCM AAD
// ต้องเรียกด้วยค่าเดียวกันทั้งตอน encrypt และ decrypt มิฉะนั้น auth จะ fail
function shardAad(meta: {
  shardIndex: number;
  totalShards: number;
  sessionId: string;
  shardSalt: string;
}): Uint8Array {
  const canonical = JSON.stringify({
    shardIndex: meta.shardIndex,
    totalShards: meta.totalShards,
    sessionId: meta.sessionId,
    shardSalt: meta.shardSalt,
  });
  return new TextEncoder().encode(canonical);
}

function xorSplit(data: Uint8Array, n: number): Uint8Array[] {
  const randoms = Array.from({ length: n - 1 }, () => randomBytes(data.length));
  const last = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    last[i] = data[i];
    for (const s of randoms) last[i] ^= s[i];
  }
  return [...randoms, last];
}

function xorRecombine(shards: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(shards[0].length);
  for (let i = 0; i < result.length; i++) result[i] = shards.reduce((acc, s) => acc ^ s[i], 0);
  return result;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hydraEncrypt(
  plaintext: string,
  password: string,
  numShards = 3
): Promise<HydraEncryptResult> {
  if (numShards < 2 || numShards > 10) throw new Error("numShards ต้อง 2-10");
  const now = Date.now();
  const masterSalt = randomBytes(32);
  const sessionId = randomBytes(16);
  const sessionIdB64 = toB64(sessionId);
  const masterKey = await pbkdf2DeriveKey(password, masterSalt);
  const layer1 = await aesGcmEncrypt(masterKey, new TextEncoder().encode(plaintext));
  const layer1Blob = new Uint8Array([...layer1.iv, ...layer1.ciphertext]);
  const rawShards = xorSplit(layer1Blob, numShards);
  const masterKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", masterKey));
  const shards: HydraShard[] = [];
  for (let i = 0; i < rawShards.length; i++) {
    const shardSalt = randomBytes(16);
    const shardSaltB64 = toB64(shardSalt);
    const shardKey = await hkdfExpandKey(
      masterKeyBytes,
      `hydra-shard-${i}-session-${sessionIdB64}`,
      shardSalt
    );
    const aad = shardAad({
      shardIndex: i, totalShards: numShards, sessionId: sessionIdB64, shardSalt: shardSaltB64,
    });
    const enc = await aesGcmEncrypt(shardKey, rawShards[i], aad);
    shards.push({
      shardIndex: i, totalShards: numShards, cipherMode: CIPHER_MODE,
      sessionId: sessionIdB64, masterSalt: toB64(masterSalt),
      shardSalt: shardSaltB64, iv: toB64(enc.iv),
      ciphertext: toB64(enc.ciphertext), createdAt: now,
    });
  }
  return { shards, sessionId: sessionIdB64, cipherMode: CIPHER_MODE, numShards, createdAt: now };
}

export async function hydraDecrypt(
  shards: HydraShard[],
  password: string
): Promise<HydraDecryptResult> {
  if (!shards.length) throw new Error("ไม่มี shards");
  const sorted = [...shards].sort((a, b) => a.shardIndex - b.shardIndex);
  const { totalShards, masterSalt: mSaltB64, sessionId } = sorted[0];
  if (sorted.length < totalShards) {
    throw new Error(`ต้องการ ${totalShards} shards แต่มี ${sorted.length}`);
  }
  const masterKey = await pbkdf2DeriveKey(password, fromB64(mSaltB64));
  const masterKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", masterKey));
  const decryptedShards: Uint8Array[] = [];
  for (const token of sorted) {
    const aad = shardAad({
      shardIndex: token.shardIndex, totalShards: token.totalShards,
      sessionId: token.sessionId, shardSalt: token.shardSalt,
    });
    const shardKey = await hkdfExpandKey(
      masterKeyBytes,
      `hydra-shard-${token.shardIndex}-session-${token.sessionId}`,
      fromB64(token.shardSalt)
    );
    try {
      const plain = await aesGcmDecrypt(shardKey, fromB64(token.iv), fromB64(token.ciphertext), aad);
      decryptedShards.push(plain);
    } catch {
      throw new Error(`Shard ${token.shardIndex + 1}: integrity check failed`);
    }
  }
  const blob = xorRecombine(decryptedShards);
  const plain = await aesGcmDecrypt(masterKey, blob.slice(0, 12), blob.slice(12));
  return {
    plaintext: new TextDecoder().decode(plain),
    sessionId,
    verifiedShards: sorted.length,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32);
  const key = await pbkdf2DeriveKey(password, salt, 310_000);
  const bytes = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return `pbkdf2sha512$${toB64(salt)}$${toB64(bytes)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [, saltB64, keyB64] = hash.split("$");
  if (!saltB64 || !keyB64) return false;
  const derived = await pbkdf2DeriveKey(password, fromB64(saltB64), 310_000);
  const derivedBytes = new Uint8Array(await crypto.subtle.exportKey("raw", derived));
  return constantTimeEqual(derivedBytes, fromB64(keyB64));
}
