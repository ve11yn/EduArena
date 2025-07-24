import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Get the session token from cookies
  const sessionToken = req.cookies.get("__session")?.value

  // Protected routes
  const protectedRoutes = ["/dashboard", "/play", "/duel"]
  const authRoutes = ["/login", "/register"]

  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname)

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // If accessing auth routes with session, redirect to dashboard
  if (isAuthRoute && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/play/:path*", "/duel/:path*", "/login", "/register"],
}
