import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "veraz",
    supabase: isSupabaseConfigured() ? "configured" : "pending",
    transcription: process.env.ELEVENLABS_API_KEY ? "configured" : "pending",
  }, { headers: { "Cache-Control": "no-store" } });
}
