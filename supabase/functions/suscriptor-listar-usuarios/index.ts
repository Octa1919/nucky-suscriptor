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
      .from("usuarios")
      .select("*", { count: "exact" })
      .eq("subscriber_id", subscriber_id);

    const termino = typeof busqueda === "string" ? busqueda.trim() : "";
    if (termino) {
      // Comas y paréntesis rompen la sintaxis del .or() de PostgREST.
      const limpio = termino.replace(/[,()]/g, "");
      const patron = `%${limpio}%`;
      query = query.or(`username.ilike.${patron},telefono.ilike.${patron}`);
    }

    // PostgREST corta en 1000 filas sin avisar; por eso la búsqueda se hace acá
    // (sobre toda la tabla) y no en el navegador sobre lo ya descargado.
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ data, truncado: (count ?? data.length) > data.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
