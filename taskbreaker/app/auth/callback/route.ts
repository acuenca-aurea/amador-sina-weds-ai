import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("Auth callback error", error);
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }

    logger.info("Auth callback successful");
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
