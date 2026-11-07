import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

const protectedPaths = ["/dashboard", "/meals", "/history", "/templates", "/settings"];
const authPaths = ["/login", "/signup"];

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  const { url, key } = getSupabaseConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path);
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (authPaths.includes(path) && isAuthenticated) {
    return copyCookies(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  return response;
}
