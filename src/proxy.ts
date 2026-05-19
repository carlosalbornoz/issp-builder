import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {

  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isLandingPage = pathname === "/";
  const isAboutPage = pathname === "/about";
  const isPrivacyPage = pathname === "/privacy";
  const isApiRoute = pathname.startsWith("/api");
  // Local-first routes — no auth required
  const isEditorRoute = pathname === "/editor" || pathname.startsWith("/editor/");
  const isAnnex1Route = pathname === "/annex1" || pathname.startsWith("/annex1/");
  const isUacsRoute = pathname === "/uacs" || pathname.startsWith("/uacs/");

  // Allow API routes through
  if (isApiRoute) return NextResponse.next();

  // Allow static assets
  if (pathname.startsWith("/_next")) return NextResponse.next();

  // OG/Twitter image generation routes — must be public for social scrapers
  if (pathname === "/opengraph-image" || pathname === "/twitter-image") return NextResponse.next();

  // Local-first editor, Annex 1, and UACS explorer — always public, no auth check
  if (isEditorRoute || isAnnex1Route || isUacsRoute) return NextResponse.next();

  // Landing page: unauthenticated users see it; authenticated users go to /editor
  if (isLandingPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/editor", req.nextUrl));
    return NextResponse.next();
  }

  // About and Privacy pages are public — always allow through regardless of auth state
  if (isAboutPage) return NextResponse.next();
  if (isPrivacyPage) return NextResponse.next();

  // If not logged in and not on auth pages, redirect to login
  if (!isLoggedIn && !isLoginPage && !isRegisterPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // If logged in and on auth pages, redirect to dashboard
  if (isLoggedIn && (isLoginPage || isRegisterPage)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads|screenshots|demo|uacs).*)"],
};
