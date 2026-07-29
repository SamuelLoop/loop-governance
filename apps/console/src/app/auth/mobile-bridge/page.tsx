"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

// Landing point for the mobile app's in-app WebView login bridge
// (see /api/mobile-auth-link). Admin-generated magic links only support the
// implicit flow, delivering the session as a #access_token=... URL fragment
// — fragments never reach the server, so middleware can't see a cookie yet
// and would otherwise bounce this straight to /login before any client JS
// ran. This path is excluded from that gate (middleware skips /auth/**) so
// the page can render, let the browser Supabase client parse the fragment
// and persist the session to cookies, then hand off to the real page.
export default function MobileBridgePage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.replace(safeNext);
        return;
      }
      // detectSessionInUrl hasn't resolved the hash fragment yet on this
      // first tick; onAuthStateChange fires once it does.
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          sub.subscription.unsubscribe();
          window.location.replace(safeNext);
        }
      });

      const timeout = setTimeout(() => {
        sub.subscription.unsubscribe();
        setFailed(true);
      }, 8000);

      return () => {
        clearTimeout(timeout);
        sub.subscription.unsubscribe();
      };
    });
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.95 0 0)",
      }}
    >
      {failed ? "Could not sign you in. Please try again." : "Signing you in…"}
    </div>
  );
}
