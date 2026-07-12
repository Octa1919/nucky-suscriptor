import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "f1d17c3e-a156-4a64-a288-c1a4f04f686d";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subscriber_id, title, message, target, username, tags, image_url } = await req.json();

    if (!subscriber_id || !message || !target) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros obligatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title || "Nucky Casino", es: title || "Nucky Casino" },
      contents: { en: message, es: message },
      url: "https://nucky-corp.vercel.app",
    };

    if (image_url) {
      payload.chrome_web_image = image_url;
      payload.big_picture = image_url;
      payload.ios_attachments = { id1: image_url };
    }

    if (target === "all") {
      // Targeting por filters: siempre acotado al tag subscriber_id de este agente.
      payload.filters = [
        { field: "tag", key: "subscriber_id", relation: "=", value: subscriber_id },
      ];
    } else if (target === "specific") {
      if (!username) {
        return new Response(
          JSON.stringify({ error: "Falta el nombre de usuario" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Confirmamos que el usuario pertenece a este suscriptor antes de resolver el ID.
      const { data: user } = await supabaseAdmin
        .from("usuarios")
        .select("username")
        .eq("username", username)
        .eq("subscriber_id", subscriber_id)
        .maybeSingle();

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Ese usuario no pertenece a este agente" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payload.include_aliases = { external_id: [`${username}__${subscriber_id}`] };
      payload.target_channel = "push";
    } else if (target === "tags") {
      if (!Array.isArray(tags) || tags.length === 0) {
        return new Response(
          JSON.stringify({ error: "Debés seleccionar al menos una etiqueta" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Resolvemos nosotros mismos qué jugadores de ESTE suscriptor tienen alguna
      // de las etiquetas seleccionadas, en vez de confiar en tags de OneSignal.
      // Filtramos en código (no con un operador SQL de arrays) porque "etiquetas"
      // es una columna jsonb, no un array nativo de Postgres.
      const { data: usuarios, error: usuariosError } = await supabaseAdmin
        .from("usuarios")
        .select("username, etiquetas")
        .eq("subscriber_id", subscriber_id);

      if (usuariosError) {
        return new Response(
          JSON.stringify({ error: usuariosError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const coincidencias = (usuarios || []).filter((u) => {
        const etiquetasUsuario: string[] = Array.isArray(u.etiquetas) ? u.etiquetas : [];
        return etiquetasUsuario.some((e) => tags.includes(e));
      });

      if (coincidencias.length === 0) {
        return new Response(
          JSON.stringify({ error: "Ningún jugador tiene esas etiquetas" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payload.include_aliases = {
        external_id: coincidencias.map((u) => `${u.username}__${subscriber_id}`),
      };
      payload.target_channel = "push";
    } else {
      return new Response(
        JSON.stringify({ error: "Tipo de envío inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error de OneSignal:", result);
      return new Response(
        JSON.stringify({ error: result.errors?.join?.(", ") || "Error de OneSignal" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
