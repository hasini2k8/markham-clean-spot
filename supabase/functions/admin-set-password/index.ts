import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { userId, password } = await req.json();
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // Verify the target user has supervisor role before allowing password change
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!roles?.some((r) => r.role === "supervisor")) {
    return new Response(JSON.stringify({ error: "target user is not a supervisor" }), { status: 403 });
  }
  const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
