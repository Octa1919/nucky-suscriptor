import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Escapa los caracteres especiales de ILIKE (%, _, \) para que la comparación
// sea una igualdad exacta (sin distinguir mayúsculas/minúsculas), no un patrón.
function escaparIlike(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

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

    // Mismo control que al crear: no permitir un nombre que ya use otro jugador
    // de este suscriptor, sin importar mayúsculas/minúsculas. Se excluye al
    // propio usuario que se está editando (puede guardar sin cambiar su nombre).
    const { data: existente, error: errorCheck } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("subscriber_id", subscriber_id)
      .neq("id", usuario_id)
      .ilike("username", escaparIlike(username))
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

    const datosActualizar: Record<string, unknown> = { username, telefono: telefono || null };
    if (password) datosActualizar.password = password;

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update(datosActualizar)
      .eq("id", usuario_id)
      .eq("subscriber_id", subscriber_id);

    if (error) {
      if (error.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: `El usuario "${username}" ya existe. Por favor elegí otro nombre.` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
