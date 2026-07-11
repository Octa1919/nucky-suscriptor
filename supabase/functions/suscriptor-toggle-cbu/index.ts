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
    const { subscriber_id, cbu_id, activo } = await req.json();

    if (!subscriber_id || !cbu_id || typeof activo !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan datos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (activo) {
      // Desactivamos todos los CBUs del suscriptor y activamos solo el elegido
      await supabaseAdmin.from("cbus").update({ activo: false }).eq("subscriber_id", subscriber_id);
      const { error } = await supabaseAdmin
        .from("cbus")
        .update({ activo: true })
        .eq("id", cbu_id)
        .eq("subscriber_id", subscriber_id);
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { error } = await supabaseAdmin
        .from("cbus")
        .update({ activo: false })
        .eq("id", cbu_id)
        .eq("subscriber_id", subscriber_id);
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
