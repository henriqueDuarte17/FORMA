import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, string>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse({ error: 'É necessário iniciar sessão para apagar a conta.' }, 401);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Faltam os segredos SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error: verificationError } = await supabase.auth.getUser(token);
    if (verificationError || !data.user) {
      return jsonResponse({ error: 'A sessão expirou. Inicia sessão novamente.' }, 401);
    }

    const { error: deletionError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (deletionError) throw deletionError;

    return jsonResponse({ message: 'A conta e os dados associados foram apagados.' }, 200);
  } catch (error) {
    console.error('Falha ao apagar conta:', error);
    return jsonResponse({ error: 'Não foi possível apagar a conta. Tenta novamente mais tarde.' }, 500);
  }
});
