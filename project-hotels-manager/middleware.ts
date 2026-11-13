import { NextRequest, NextResponse } from "next/server";

/**
 * Routes qui nécessitent une session authentifiée.
 * Les routes de gestion sont protégées par le cookie de session partagé avec
 * le client API. La page de connexion du backoffice reste publique.
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/account",
  "/appointment",
  "/backoffice",
];

/**
 * Middleware d'authentification : redirige les visiteurs non authentifiés
 * vers la page d'accueil lorsqu'ils tentent d'accéder à une route protégée.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get("makaan_access_token")?.value;
  const { pathname } = request.nextUrl;

  const isBackofficeLogin = pathname === "/backoffice/login";
  const isProtected =
    !isBackofficeLogin &&
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/backoffice")
      ? "/backoffice/login"
      : "/";
    url.search = pathname.startsWith("/backoffice") ? "" : "?auth=required";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclut les ressources statiques et les routes API du middleware.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|.*\\..*).*)"],
};
