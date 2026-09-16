import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./lib/session";

const PROTECTED = [
  "/dashboard",
  "/security",
  "/admin",
  "/api/protected",
  "/api/hydra",
  "/api/companion",
  "/api/doctor",
  "/api/admin",
  "/api/screening",
  "/api/security",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    // API route ต้องได้ JSON 401 กลับไป ไม่ใช่ redirect — fetch() client เช็ค
    // json.success จะพังถ้าได้ HTML ของหน้า "/" กลับมาแทน (confirmed bug จากรีวิว)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.next();
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("x-frame-options", "DENY");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/security/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
    "/api/hydra",
    "/api/companion/:path*",
    "/api/doctor/:path*",
    "/api/admin/:path*",
    "/api/screening/:path*",
    "/api/security/:path*",
  ],
};
