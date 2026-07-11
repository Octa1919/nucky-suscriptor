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
    const {
      subscriber_id,
      nombre_casino,
      whatsapp,
      sala1_link,
      sala2_link,
      sala3_link,
      sala4_link,
      instagram,
      telegram,
      premios_normal,
      premios_dorada,
      dias_dorada,
      primary_color,
      accent_color,
      button_text_color,
    } = await req.json();

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

    const { error } = await supabaseAdmin
      .from("suscriptores")
      .update({
        nombre_casino: nombre_casino || null,
        whatsapp: whatsapp || null,
        sala1_link: sala1_link || null,
        sala2_link: sala2_link || null,
        sala3_link: sala3_link || null,
        sala4_link: sala4_link || null,
        instagram: instagram || null,
        telegram: telegram || null,
        premios_normal: premios_normal || null,
        premios_dorada: premios_dorada || null,
        dias_dorada,
        primary_color,
        accent_color,
        button_text_color,
      })
      .eq("id", subscriber_id);

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
