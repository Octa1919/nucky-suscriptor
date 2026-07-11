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
    const { subscriber_id, activa, periodicidad_horas, premio_correcto } = await req.json();

    if (!subscriber_id) {
      return new Response(
        JSON.stringify({ success: false, error: "No se detectó el suscriptor" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existente } = await supabaseAdmin
      .from("trivias")
      .select("id")
      .eq("subscriber_id", subscriber_id)
      .single();

    let error;

    if (existente) {
      const { error: updateError } = await supabaseAdmin
        .from("trivias")
        .update({
          activa: activa === true,
          periodicidad_horas: periodicidad_horas || 24,
          premio_correcto: premio_correcto || null,
        })
        .eq("subscriber_id", subscriber_id);
      error = updateError;
    } else {
      const { error: insertError } = await supabaseAdmin.from("trivias").insert({
        subscriber_id,
        activa: activa === true,
        periodicidad_horas: periodicidad_horas || 24,
        premio_correcto: premio_correcto || null,
      });
      error = insertError;
    }

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
