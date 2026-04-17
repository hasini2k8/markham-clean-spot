import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { beforeUrl, afterUrl } = await req.json();
    if (!beforeUrl || !afterUrl) {
      return new Response(JSON.stringify({ error: "beforeUrl and afterUrl required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are an inspector verifying community cleanup work. Compare the BEFORE and AFTER photos. Decide if the location is now clean. Be strict: minor improvement is not enough. Only call use_verdict tool to respond.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "BEFORE photo:" },
            { type: "image_url", image_url: { url: beforeUrl } },
            { type: "text", text: "AFTER photo:" },
            { type: "image_url", image_url: { url: afterUrl } },
            { type: "text", text: "Is the area clean now? Provide verdict and reasoning." },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "use_verdict",
            description: "Return cleanup verdict",
            parameters: {
              type: "object",
              properties: {
                verdict: { type: "string", enum: ["clean", "not_clean", "unclear"] },
                reasoning: { type: "string", description: "1-3 sentences explaining the decision" },
              },
              required: ["verdict", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "use_verdict" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
        status: 429, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!r.ok) {
      const t = await r.text();
      console.error("AI gateway error", r.status, t);
      return new Response(JSON.stringify({ error: "AI verification failed" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ verdict: "unclear", reasoning: "AI did not return a structured verdict." }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-cleanup error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
