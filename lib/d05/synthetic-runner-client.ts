/**
 * D05 synthetic runner adapter. This is intentionally isolated from the clinical
 * request path: no patient/session/PHI payloads, no Owner-grant minting, and no
 * automatic START attestation. The gateway remains the enforcement boundary.
 *
 * The v1.0.40 gateway only permits loopback; this adapter refuses remote URLs too.
 * Do not enable it as a production/multi-host admission mechanism.
 */
export type D05Severity = "MINOR" | "MAJOR";

export interface D05RunnerConfig {
  gatewayUrl: string;
  runnerActor: string;
  runnerApiKey: string;
  timeoutMs?: number;
}

export interface D05Admit {
  case_id: string;
  environment: string;
  operation: string;
  intent_digest: string;
  grant_id: string;
  idempotency_key: string;
  severity: D05Severity;
}
export interface D05Dispatch {
  attempt_id: string;
  environment: string;
  operation: string;
}
export interface D05Start {
  attempt_id: string;
  single_use_token: string;
  /** SHA-256 of independent execution evidence; never invent a receipt. */
  receipt_sha256: string;
}
export interface D05Finish {
  attempt_id: string;
  outcome: "PASSED" | "FAILED" | "TIMEOUT";
}
export interface D05Unknown {
  attempt_id: string;
  reason_code: string;
}

export class D05AdmissionError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super("D05 admission rejected (" + status + ", " + code + ")");
    this.name = "D05AdmissionError";
  }
}

function required(value: string, name: string): string {
  if (!value || !value.trim()) throw new Error("D05 missing " + name);
  return value;
}

function gatewayOrigin(raw: string): string {
  const url = new URL(required(raw, "gatewayUrl"));
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("D05 prototype requires a loopback HTTP origin only");
  }
  return url.origin;
}

function sha256Hex(value: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(value);
}

export class D05RunnerClient {
  private readonly origin: string;
  private readonly actor: string;
  private readonly key: string;
  private readonly timeout: number;

  constructor(config: D05RunnerConfig) {
    this.origin = gatewayOrigin(config.gatewayUrl);
    this.actor = required(config.runnerActor, "runnerActor");
    this.key = required(config.runnerApiKey, "runnerApiKey");
    if (this.key.length < 32) throw new Error("D05 runner key is too short");
    this.timeout = config.timeoutMs ?? 5000;
    if (!Number.isSafeInteger(this.timeout) || this.timeout < 100 || this.timeout > 30000) {
      throw new Error("D05 timeoutMs must be 100..30000");
    }
  }

  private async post<T>(path: string, payload: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await fetch(this.origin + path, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: { "content-type": "application/json", "x-api-key": this.key },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch {
      // Do not assume unstarted: a timed-out admission/start could have committed.
      throw new D05AdmissionError(503, "UNKNOWN_REMOTE_STATE_HOLD");
    }
    if (!response.ok) {
      // Do not echo remote bodies (which could contain tokens or sensitive data).
      throw new D05AdmissionError(response.status, "GATEWAY_REJECTED");
    }
    try {
      return await response.json() as T;
    } catch {
      throw new D05AdmissionError(502, "INVALID_GATEWAY_RESPONSE_HOLD");
    }
  }

  admit<T = unknown>(input: D05Admit): Promise<T> {
    if (!["MINOR", "MAJOR"].includes(input.severity)) throw new Error("Invalid severity");
    return this.post<T>("/runner/admit", { ...input, actor: this.actor });
  }
  dispatch<T = unknown>(input: D05Dispatch): Promise<T> {
    return this.post<T>("/runner/dispatch", { ...input, actor: this.actor });
  }
  /** Call ONLY after independent execution evidence exists; never auto-call on dispatch. */
  start<T = unknown>(input: D05Start): Promise<T> {
    if (!sha256Hex(input.receipt_sha256)) throw new Error("Invalid START receipt SHA-256");
    return this.post<T>("/runner/start", input);
  }
  finish<T = unknown>(input: D05Finish): Promise<T> {
    return this.post<T>("/runner/finish", input);
  }
  unknown<T = unknown>(input: D05Unknown): Promise<T> {
    return this.post<T>("/runner/unknown", input);
  }
}

/** No auto-connect in application startup. Caller must explicitly opt in. */
export function d05RunnerFromEnv(): D05RunnerClient {
  if (process.env.HYDRA_D05_SYNTHETIC_ENABLED !== "true") {
    throw new Error("D05 synthetic adapter disabled (fail closed)");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("D05 v1.0.40 prototype cannot be enabled in production");
  }
  return new D05RunnerClient({
    gatewayUrl: required(process.env.HYDRA_D05_GATEWAY_URL ?? "", "HYDRA_D05_GATEWAY_URL"),
    runnerActor: required(process.env.HYDRA_D05_RUNNER_ACTOR ?? "", "HYDRA_D05_RUNNER_ACTOR"),
    runnerApiKey: required(process.env.HYDRA_D05_RUNNER_KEY ?? "", "HYDRA_D05_RUNNER_KEY"),
  });
}
