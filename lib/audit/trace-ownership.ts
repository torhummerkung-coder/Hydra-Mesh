// Shared ownership invariant for traces.
// A correlation ID must not be treated as belonging to one patient if its events
// explicitly identify more than one patient. Unscoped system events are ignored;
// callers must separately decide whether an unscoped trace is visible.
export interface TracePatientOwnership {
  patientId?: string;
  conflict: boolean;
}

export function deriveTracePatientOwnership(
  events: ReadonlyArray<{ patientId?: string }>
): TracePatientOwnership {
  const patientIds = new Set(
    events
      .map((event) => event.patientId)
      .filter((patientId): patientId is string => typeof patientId === "string" && patientId.length > 0)
  );

  if (patientIds.size > 1) return { conflict: true };
  const patientId = patientIds.values().next().value as string | undefined;
  return patientId ? { patientId, conflict: false } : { conflict: false };
}
