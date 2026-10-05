import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

interface HandlerResult {
  status: number;
  body: any;
}

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hydra-clinician-auth-"));
  await fs.writeFile(path.join(tempDir, "test.db"), "");
  process.env.DATABASE_URL = `file:${path.join(tempDir, "test.db")}`;
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  process.env.PATIENT_DATA_MASTER_KEY = randomBytes(32).toString("hex");
  process.env.GEMINI_API_KEY = "test-only";

  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"],
    { env: process.env, stdio: "pipe" }
  );

  const { prisma } = await import("../lib/db");
  const { createSessionToken, SESSION_COOKIE_NAME } = await import("../lib/session");
  const { default: patientsHandler } = await import("../pages/api/doctor/patients");
  const { default: summaryHandler } = await import("../pages/api/doctor/patient-summary");
  const { default: reviewHandler } = await import("../pages/api/doctor/review-queue");
  const { default: traceHandler } = await import("../pages/api/doctor/event-trace");
  const { default: assignmentHandler } = await import("../pages/api/admin/care-assignments");

  const users = [
    { id: "patient-a", username: "patient-a", role: "patient" },
    { id: "patient-b", username: "patient-b", role: "patient" },
    { id: "doctor-a", username: "doctor-a", role: "doctor" },
    { id: "doctor-b", username: "doctor-b", role: "doctor" },
    { id: "staff-a", username: "staff-a", role: "staff" },
    { id: "admin-a", username: "admin-a", role: "admin" },
    { id: "security-a", username: "security-a", role: "security" },
  ];
  await prisma.user.createMany({
    data: users.map((user) => ({ ...user, passwordHash: "test-only", displayName: user.id })),
  });
  await prisma.careAssignment.createMany({
    data: [
      { patientId: "patient-a", clinicianId: "doctor-a", assignedById: "admin-a" },
      { patientId: "patient-b", clinicianId: "doctor-b", assignedById: "admin-a" },
      { patientId: "patient-a", clinicianId: "staff-a", assignedById: "admin-a" },
      {
        patientId: "patient-b",
        clinicianId: "doctor-a",
        assignedById: "admin-a",
        expiresAt: new Date(Date.now() - 60_000),
      },
    ],
  });

  const reviewA = await prisma.reviewQueueItem.create({
    data: {
      patientId: "patient-a",
      source: "chat_risk_engine",
      reason: "synthetic test A",
      riskLevel: "high",
      severity: "high",
      notifyImmediately: true,
    },
  });
  const reviewB = await prisma.reviewQueueItem.create({
    data: {
      patientId: "patient-b",
      source: "screening_8q",
      reason: "synthetic test B",
      riskLevel: "critical",
      severity: "critical",
      notifyImmediately: true,
    },
  });

  const tokens = {
    doctorA: await createSessionToken({ sub: "doctor-a", role: "doctor" }),
    doctorB: await createSessionToken({ sub: "doctor-b", role: "doctor" }),
    staffA: await createSessionToken({ sub: "staff-a", role: "staff" }),
    adminA: await createSessionToken({ sub: "admin-a", role: "admin" }),
    patientA: await createSessionToken({ sub: "patient-a", role: "patient" }),
    securityA: await createSessionToken({ sub: "security-a", role: "security" }),
  };

  async function call(
    handler: (req: any, res: any) => unknown,
    input: { method: string; token?: string; body?: unknown; query?: unknown }
  ): Promise<HandlerResult> {
    let status = 200;
    let body: unknown;
    const res: any = {
      setHeader: () => undefined,
      status(code: number) {
        status = code;
        return res;
      },
      json(value: unknown) {
        body = value;
        return res;
      },
    };
    await handler(
      {
        method: input.method,
        cookies: input.token ? { [SESSION_COOKIE_NAME]: input.token } : {},
        body: input.body ?? {},
        query: input.query ?? {},
      },
      res
    );
    return { status, body };
  }

  const { saveMessage } = await import("../lib/clinical/conversation-store");
  await saveMessage("patient-a", "user", "synthetic source A");
  await saveMessage("patient-b", "user", "synthetic source B");
  const originalFetch = globalThis.fetch;
  let summaryFinishReason = "STOP";
  globalThis.fetch = async () =>
    Response.json({ candidates: [{ finishReason: summaryFinishReason, content: { parts: [{ text: "สรุปทดสอบที่ไม่ใช้ข้อมูลจริง" }] } }] });

  try {
    const patientsA = await call(patientsHandler, { method: "GET", token: tokens.doctorA });
    assert.equal(patientsA.status, 200);
    assert.deepEqual(patientsA.body.data.map((patient: any) => patient.id), ["patient-a"]);
    assert.equal(patientsA.body.data[0].riskLevel, "high");

    const patientsB = await call(patientsHandler, { method: "GET", token: tokens.doctorB });
    assert.deepEqual(patientsB.body.data.map((patient: any) => patient.id), ["patient-b"]);
    const patientsStaff = await call(patientsHandler, { method: "GET", token: tokens.staffA });
    assert.deepEqual(patientsStaff.body.data.map((patient: any) => patient.id), ["patient-a"]);
    const patientCannotList = await call(patientsHandler, { method: "GET", token: tokens.patientA });
    assert.equal(patientCannotList.status, 403);
    await prisma.user.update({ where: { id: "doctor-a" }, data: { role: "patient" } });
    const staleDoctorToken = await call(patientsHandler, { method: "GET", token: tokens.doctorA });
    assert.equal(staleDoctorToken.status, 403);
    await prisma.user.update({ where: { id: "doctor-a" }, data: { role: "doctor" } });
    console.log("PASS patient directory returns only active assignments and never defaults unknown to low");

    const assignedSummary = await call(summaryHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { patientId: "patient-a" },
    });
    assert.equal(assignedSummary.status, 200);
    assert.equal(assignedSummary.body.success, true);
    assert.equal(assignedSummary.body.data.summaryStatus, "available");

    summaryFinishReason = "MAX_TOKENS";
    const truncatedSummary = await call(summaryHandler, {
      method: "POST", token: tokens.doctorA, body: { patientId: "patient-a" },
    });
    assert.equal(truncatedSummary.status, 200);
    assert.equal(truncatedSummary.body.success, true);
    assert.equal(truncatedSummary.body.data.summaryStatus, "unavailable");
    assert.deepEqual(truncatedSummary.body.data.sourceMessages.map((m: any) => m.content), ["synthetic source A"]);
    assert(!JSON.stringify(truncatedSummary.body).includes("สรุปทดสอบที่ไม่ใช้ข้อมูลจริง"));
    summaryFinishReason = "STOP";
    console.log("PASS truncated summary returns only authorized source data without partial AI text");

    const crossCaseSummary = await call(summaryHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { patientId: "patient-b" },
    });
    assert.equal(crossCaseSummary.status, 404);
    console.log("PASS clinician can decrypt assigned case and cannot probe an unassigned patient");

    const queueA = await call(reviewHandler, { method: "GET", token: tokens.doctorA });
    assert.deepEqual(queueA.body.data.map((item: any) => item.id), [reviewA.id]);

    const crossCaseAck = await call(reviewHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { id: reviewB.id },
    });
    assert.equal(crossCaseAck.status, 404);
    assert.equal((await prisma.reviewQueueItem.findUnique({ where: { id: reviewB.id } }))?.acknowledged, false);

    const assignedAck = await call(reviewHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { id: reviewA.id },
    });
    assert.equal(assignedAck.status, 200);
    const storedAck = await prisma.reviewQueueItem.findUnique({ where: { id: reviewA.id } });
    assert.equal(storedAck?.acknowledgedById, "doctor-a");
    assert(storedAck?.acknowledgedAt);
    console.log("PASS review queue and acknowledgement are assignment-scoped with human evidence");

    const { logEvent } = await import("../lib/audit/audit-log");
    const patientATraceId = crypto.randomUUID();
    const patientBTraceId = crypto.randomUUID();
    logEvent("message_received", "orchestrator", patientATraceId, { length: 10 }, "patient-a");
    logEvent("companion_reply", "orchestrator", patientATraceId, { mode: "normal" }, "patient-a");
    logEvent("message_received", "orchestrator", patientBTraceId, { length: 12 }, "patient-b");
    logEvent("companion_reply", "orchestrator", patientBTraceId, { mode: "normal" }, "patient-b");

    const doctorTraceList = await call(traceHandler, { method: "GET", token: tokens.doctorA });
    assert.equal(doctorTraceList.status, 200);
    assert(doctorTraceList.body.data.every((t: any) => t.patientId === "patient-a"));
    assert(doctorTraceList.body.data.some((t: any) => t.correlationId === patientATraceId));
    assert(!doctorTraceList.body.data.some((t: any) => t.correlationId === patientBTraceId));

    const doctorOwnChain = await call(traceHandler, {
      method: "GET",
      token: tokens.doctorA,
      query: { correlationId: patientATraceId },
    });
    assert.equal(doctorOwnChain.status, 200);
    assert.equal(doctorOwnChain.body.data.patientId, "patient-a");

    const doctorCrossChain = await call(traceHandler, {
      method: "GET",
      token: tokens.doctorA,
      query: { correlationId: patientBTraceId },
    });
    assert.equal(doctorCrossChain.status, 404);

    const patientCannotTrace = await call(traceHandler, { method: "GET", token: tokens.patientA });
    assert.equal(patientCannotTrace.status, 403);

    const securityTrace = await call(traceHandler, { method: "GET", token: tokens.securityA });
    assert.equal(securityTrace.status, 200);
    assert(securityTrace.body.data.some((t: any) => t.correlationId === patientATraceId));
    assert(securityTrace.body.data.some((t: any) => t.correlationId === patientBTraceId));
    console.log("PASS event trace is patient-scoped for clinicians (least privilege) and unrestricted for security");

    const unownedTraceId = crypto.randomUUID();
    const unownedMarker = "synthetic unowned trace payload";
    logEvent("message_received", "orchestrator", unownedTraceId, { marker: unownedMarker });
    logEvent("companion_reply", "orchestrator", unownedTraceId, { mode: "normal" });

    const missingTraceId = crypto.randomUUID();
    for (const token of [tokens.doctorA, tokens.staffA]) {
      const list = await call(traceHandler, { method: "GET", token });
      assert.equal(list.status, 200);
      assert(!list.body.data.some((t: any) => t.correlationId === unownedTraceId));
      const unowned = await call(traceHandler, {
        method: "GET", token, query: { correlationId: unownedTraceId },
      });
      const missing = await call(traceHandler, {
        method: "GET", token, query: { correlationId: missingTraceId },
      });
      assert.equal(unowned.status, 404);
      assert.equal(missing.status, 404);
      assert.deepEqual(unowned.body, missing.body);
      assert(!JSON.stringify(unowned.body).includes(unownedMarker));
    }
    const securityUnowned = await call(traceHandler, {
      method: "GET", token: tokens.securityA, query: { correlationId: unownedTraceId },
    });
    assert.equal(securityUnowned.status, 200);
    assert.equal(securityUnowned.body.data.patientId, undefined);
    assert(securityUnowned.body.data.steps.some((step: any) => step.payload?.marker === unownedMarker));
    console.log("PASS unowned trace is hidden from doctor/staff; security can inspect the existing trace");

    const doctorCannotAssign = await call(assignmentHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { action: "assign", patientId: "patient-b", clinicianId: "doctor-a" },
    });
    assert.equal(doctorCannotAssign.status, 403);

    const adminAssigns = await call(assignmentHandler, {
      method: "POST",
      token: tokens.adminA,
      body: {
        action: "assign",
        patientId: "patient-b",
        clinicianId: "doctor-a",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    assert.equal(adminAssigns.status, 200);
    const newlyAssignedSummary = await call(summaryHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { patientId: "patient-b" },
    });
    assert.equal(newlyAssignedSummary.status, 200);

    const adminRevokes = await call(assignmentHandler, {
      method: "POST",
      token: tokens.adminA,
      body: { action: "revoke", patientId: "patient-b", clinicianId: "doctor-a" },
    });
    assert.equal(adminRevokes.status, 200);
    const revokedSummary = await call(summaryHandler, {
      method: "POST",
      token: tokens.doctorA,
      body: { patientId: "patient-b" },
    });
    assert.equal(revokedSummary.status, 404);
    console.log("PASS only admin can assign/revoke access; revocation takes effect before decryption");
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
