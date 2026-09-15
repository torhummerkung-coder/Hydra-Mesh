// Prisma client singleton — pattern มาตรฐานของ Next.js กัน hot-reload ตอน dev
// สร้าง PrismaClient ใหม่ทุกครั้งที่ไฟล์ถูก re-import จน connection เกิน limit
// ของ SQLite (ดู Prisma docs: "best practice for instantiating PrismaClient with Next.js")

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
