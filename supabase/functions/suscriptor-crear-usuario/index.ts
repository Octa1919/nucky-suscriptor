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
    const { subscriber_id, username, password, telefono } = await req.json();

    if (!subscriber_id || !username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuario y contraseña son obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existente, error: errorCheck } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("subscriber_id", subscriber_id)
      .ilike("username", username)
      .limit(1);

    if (errorCheck) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al verificar el usuario: " + errorCheck.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existente && existente.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `El usuario "${username}" ya existe. Por favor elegí otro nombre.` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabaseAdmin.from("usuarios").insert({
      subscriber_id,
      username,
      password,
      telefono: telefono || null,
    });

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: `El usuario "${username}" ya existe. Por favor elegí otro nombre.` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: "Error al crear el usuario: " + error.message }),
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
