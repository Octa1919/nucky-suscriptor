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
    const { subscriber_id, usuario_id, etiqueta, accion } = await req.json();

    if (!subscriber_id || !usuario_id || !etiqueta || !accion) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan datos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (accion !== "agregar" && accion !== "quitar") {
      return new Response(
        JSON.stringify({ success: false, error: "Acción inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: user } = await supabaseAdmin
      .from("usuarios")
      .select("etiquetas")
      .eq("id", usuario_id)
      .eq("subscriber_id", subscriber_id)
      .single();

    let etiquetasActuales: string[] = user?.etiquetas || [];

    if (accion === "agregar") {
      if (etiquetasActuales.includes(etiqueta)) {
        return new Response(
          JSON.stringify({ success: true, sin_cambios: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      etiquetasActuales.push(etiqueta);
    } else {
      etiquetasActuales = etiquetasActuales.filter((e) => e !== etiqueta);
    }

    const { error } = await supabaseAdmin
      .from("usuarios")
      .update({ etiquetas: etiquetasActuales })
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
