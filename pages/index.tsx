import { useState } from "react";
import { useRouter } from "next/router";

// ปลายทางหลัง login สำเร็จ ตาม role ที่ /api/auth/login คืนมา — "admin" ไม่มีหน้า
// ของตัวเองในระบบนี้ (schema เผื่อ role ไว้ แต่ยังไม่มีหน้า UI ให้ ตั้งใจไม่สร้าง
// อะไรมั่วๆ ให้ดูเหมือนใช้ได้ทั้งที่ไม่มีจริง)
const ROLE_DESTINATION: Record<string, string> = {
  patient: "/companion",
  doctor: "/dashboard",
  staff: "/dashboard",
  security: "/security",
};

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"patient" | "doctor" | "credential" | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function demoLogin(role: "patient" | "doctor") {
    setError(null);
    setLoading(role);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        setError("Demo login ปิดอยู่ — ต้องตั้ง DEMO_AUTH_ENABLED=true ใน .env.local ก่อน");
        setLoading(null);
        return;
      }
      router.push(role === "doctor" ? "/dashboard" : "/companion");
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
      setLoading(null);
    }
  }

  async function credentialLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError(null);
    setLoading("credential");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(null);
        return;
      }

      const destination = ROLE_DESTINATION[json.data.role];
      if (!destination) {
        // role มีจริงใน DB (เช่น "admin") แต่ระบบยังไม่มีหน้าให้ — บอกตรงๆ
        // ดีกว่า redirect ไปหน้าที่ทำอะไรไม่ได้แล้วดูเหมือนพัง
        setError(`เข้าสู่ระบบสำเร็จ แต่ยังไม่มีหน้าสำหรับ role "${json.data.role}"`);
        setLoading(null);
        return;
      }
      router.push(destination);
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-semibold text-gray-900">Hydra Mesh</h1>
        <p className="mb-6 text-center text-sm text-gray-500">เข้าสู่ระบบด้วยบัญชีของคุณ</p>

        <form onSubmit={credentialLogin} className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ชื่อผู้ใช้"
            autoComplete="username"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="รหัสผ่าน"
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            disabled={loading !== null || !username.trim() || !password}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading === "credential" ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">หรือทดลองใช้แบบ demo</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="mb-3 text-center text-xs text-gray-400">
          ไม่ใช่ authentication จริง (ต้องตั้ง{" "}
          <code className="rounded bg-gray-100 px-1">DEMO_AUTH_ENABLED=true</code> ก่อน)
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => demoLogin("patient")}
            disabled={loading !== null}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === "patient" ? "กำลังเข้าสู่ระบบ..." : "เข้าเป็นผู้ป่วย (demo)"}
          </button>
          <button
            onClick={() => demoLogin("doctor")}
            disabled={loading !== null}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === "doctor" ? "กำลังเข้าสู่ระบบ..." : "เข้าเป็นแพทย์ (demo)"}
          </button>
        </div>
      </div>
    </div>
  );
}
