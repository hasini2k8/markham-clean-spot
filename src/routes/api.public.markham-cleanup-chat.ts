import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/markham-cleanup-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
          if (!question) return Response.json({ error: "Ask a Markham cleanup question first." }, { status: 400 });

          const { data } = await supabaseAdmin
            .from("cleanup_sessions")
            .select("location_name, lat, lng, status, ai_verdict, ai_reasoning, duration_minutes, created_at, reviewed_at")
            .order("created_at", { ascending: false })
            .limit(80);

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return Response.json({ error: "AI is not configured yet." }, { status: 500 });

          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: [
                    "You are MaVo's cleanup advisor for Markham, Ontario only.",
                    "Use only the provided MaVo cleanup data and general Markham geography. Do not recommend places outside Markham.",
                    "Estimate which Markham area may need cleaning most based on repeated pending/rejected/not_clean/unclear reports, old cleanups, and location descriptions.",
                    "If the user asks for anything unrelated to Markham cleanup locations, politely redirect to Markham cleanup advice.",
                    "Answer concisely with one recommended area, why, and a practical safety note.",
                  ].join("\n"),
                },
                {
                  role: "user",
                  content: `Question: ${question}\n\nRecent Markham cleanup data:\n${JSON.stringify(data ?? []).slice(0, 12000)}`,
                },
              ],
            }),
          });

          if (!response.ok) return Response.json({ error: "AI could not answer right now." }, { status: 502 });
          const ai = await response.json();
          return Response.json({ answer: ai.choices?.[0]?.message?.content ?? "I could not estimate a cleanup area from the current Markham data." });
        } catch {
          return Response.json({ error: "Chat failed. Please try again." }, { status: 500 });
        }
      },
    },
  },
});