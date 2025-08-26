import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  console.log("OAuth callback hit:", request.url);
  
  try {
    // Parse the URL and get parameters
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const error = requestUrl.searchParams.get("error");

    console.log("OAuth callback - Code:", code ? "present" : "missing");
    console.log("OAuth callback - Error:", error);

    // Handle error from OAuth provider
    if (error) {
      console.error("OAuth provider error:", error);
      const errorUrl = new URL("/signin", request.url);
      errorUrl.searchParams.set("error", "OAuth authentication failed. Please try again.");
      return NextResponse.redirect(errorUrl);
    }

    // Get the redirect destination (or default to app)
    const redirectTo = requestUrl.searchParams.get("redirect") || "/app";

    if (code) {
      // Create a Supabase server client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase configuration");
      }

      let response = NextResponse.redirect(new URL(redirectTo, request.url));

      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      // Exchange the code for a session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error exchanging code for session:", exchangeError);
        throw exchangeError;
      }

      console.log("Session exchange successful:", data.session ? "session created" : "no session");

      return response;
    }

    // No code parameter - redirect to sign-in
    console.log("No code parameter found, redirecting to signin");
    return NextResponse.redirect(new URL("/signin", request.url));

  } catch (error) {
    console.error("Auth callback error:", error);

    // In case of error, redirect to sign-in with error message
    const errorUrl = new URL("/signin", request.url);
    errorUrl.searchParams.set(
      "error",
      "Authentication failed. Please try again.",
    );

    return NextResponse.redirect(errorUrl);
  }
}

// Also handle POST requests (some OAuth providers use POST)
export async function POST(request: NextRequest) {
  return GET(request);
}
