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
    const { subscriber_id, username } = await req.json();

    if (!subscriber_id || !username) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan datos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: user } = await supabaseAdmin
      .from("usuarios")
      .select("id, racha_ruleta, ultima_ruleta")
      .eq("username", username)
      .eq("subscriber_id", subscriber_id)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ahora = new Date();
    let nuevaRacha = 1;

    if (user.ultima_ruleta) {
      const ultimaEntrega = new Date(user.ultima_ruleta);
      const horasPasadas = (ahora.getTime() - ultimaEntrega.getTime()) / (1000 * 60 * 60);

      if (horasPasadas < 48) {
        nuevaRacha = (user.racha_ruleta || 0) + 1;
      } else {
        nuevaRacha = 1;
      }
    }

    await supabaseAdmin
      .from("usuarios")
      .update({ ultima_ruleta: ahora.toISOString(), racha_ruleta: nuevaRacha })
      .eq("id", user.id);

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
