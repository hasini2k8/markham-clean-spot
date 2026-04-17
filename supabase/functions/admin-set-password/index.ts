import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { secret, userId, password } = await req.json();
  if (secret !== Deno.env.get("ADMIN_BOOTSTRAP_SECRET")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
