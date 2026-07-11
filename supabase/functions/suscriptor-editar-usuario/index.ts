import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscriber_id, usuario_id, username, password, telefono } = await req.json();

    if (!subscriber_id || !usuario_id || !username) {
      return new Response(
        JSON.stringify({ success: false, error: "El nombre de usuario es obligatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const datosActualizar: Record<string, unknown> = { username, telefono: telefono || null };
    if (password) datosActualizar.password = password;

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update(datosActualizar)
      .eq("id", usuario_id)
      .eq("subscriber_id", subscriber_id);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
