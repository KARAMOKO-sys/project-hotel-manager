import { NextRequest, NextResponse } from "next/server";

/**
 * Routes qui nécessitent une session authentifiée.
 * Le flux de connexion n'étant pas encore branché, cette liste sert de
 * socle : dès qu'un utilisateur se connecte, un token est déposé dans le
 * cookie `makaan_access_token` et ces routes deviennent accessibles.
 */
const PROTECTED_ROUTES = ["/dashboard", "/account", "/appointment"];

/**
 * Middleware d'authentification : redirige les visiteurs non authentifiés
 * vers la page d'accueil lorsqu'ils tentent d'accéder à une route protégée.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get("makaan_access_token")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?auth=required";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclut les ressources statiques et les routes API du middleware.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|.*\\..*).*)"],
};
