import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const genericError = "CNPJ ou senha incorretos.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCnpj(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function isValidCnpj(value: string) {
  if (!/^\d{14}$/.test(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false;

  const calc = (base: string) => {
    let factor = base.length - 5;
    let sum = 0;
    for (const digit of base) {
      sum += Number(digit) * factor;
      factor -= 1;
      if (factor < 2) factor = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calc(value.slice(0, 12));
  const second = calc(value.slice(0, 12) + first);
  return Number(value[12]) === first && Number(value[13]) === second;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const body = await req.json();
    const cnpj = normalizeCnpj(body?.cnpj);
    const senha = String(body?.senha ?? "");

    if (!isValidCnpj(cnpj) || !senha) return json({ error: genericError }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Secrets do Supabase não configurados.");
      return json({ error: "Serviço de autenticação temporariamente indisponível." }, 500);
    }

    // Service Role fica somente no servidor e permite consultar o CNPJ sem
    // abrir uma policy pública de leitura em perfis_empresa.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: perfil, error: perfilError } = await admin
      .from("perfis_empresa")
      .select("usuario_id")
      .eq("cnpj", cnpj)
      .maybeSingle();

    // Não diferenciamos CNPJ inexistente de credencial inválida.
    if (perfilError || !perfil?.usuario_id) return json({ error: genericError }, 401);

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(perfil.usuario_id);
    const email = userData?.user?.email;

    if (userError || !email) return json({ error: genericError }, 401);

    // O password grant é executado no servidor; o e-mail associado ao CNPJ
    // nunca precisa ser devolvido ao frontend.
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: senha }),
    });

    const tokenBody = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
      const code = String(tokenBody?.code || "").toLowerCase();
      const message = String(tokenBody?.msg || tokenBody?.message || "").toLowerCase();

      if (code.includes("email_not_confirmed") || message.includes("email not confirmed")) {
        return json({ error: "E-mail ainda não confirmado." }, 401);
      }

      return json({ error: genericError }, 401);
    }

    return json({
      session: {
        access_token: tokenBody.access_token,
        refresh_token: tokenBody.refresh_token,
        expires_in: tokenBody.expires_in,
        expires_at: tokenBody.expires_at,
        token_type: tokenBody.token_type,
      },
      user: {
        id: tokenBody.user?.id,
      },
    });
  } catch (error) {
    console.error("login-empresa-cnpj:", error);
    return json({ error: "Não foi possível realizar o login." }, 500);
  }
});
