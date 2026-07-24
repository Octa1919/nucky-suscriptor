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
    const { subscriber_id, busqueda } = await req.json();

    if (!subscriber_id) {
      return new Response(
        JSON.stringify({ error: "Falta subscriber_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabaseAdmin
      .from("premios_ruleta")
      .select("usuario, premio, codigo, created_at, entregado_at")
      .eq("subscriber_id", subscriber_id)
      .eq("estado", "entregado");

    const termino = typeof busqueda === "string" ? busqueda.trim() : "";
    if (termino) {
      // Comas y paréntesis rompen la sintaxis del .or() de PostgREST, así que
      // los sacamos: no son caracteres que alguien busque en un nombre o código.
      const limpio = termino.replace(/[,()]/g, "");
      const patron = `%${limpio}%`;
      query = query.or(`usuario.ilike.${patron},codigo.ilike.${patron}`);
    }

    const { data, error } = await query
      .order("entregado_at", { ascending: false })
      .limit(100);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
