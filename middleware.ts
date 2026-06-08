import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/dashboard",
  "/stock",
  "/accounts",
  "/customers",
  "/suppliers",
  "/goldsmiths",
  "/salesmen",
  "/categories",
  "/subcategories",
  "/purchases",
  "/sales",
  "/reports",
  "/settings",
  "/backup",
  "/sms",
  "/users",
  "/search"
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if path is protected
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
