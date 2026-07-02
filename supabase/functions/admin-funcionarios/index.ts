import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PAPEIS_VALIDOS = ['aprovador', 'gestor', 'coordenador', 'gerente', 'viagens', 'emissor_viagens', 'financeiro', 'promotor', 'financeiro_viagens']
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://rdv-cleantabaco.vercel.app'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verifica se o chamador é gestor/aprovador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const sbUrl  = Deno.env.get('SUPABASE_URL')!
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin  = createClient(sbUrl, svcKey, { auth: { persistSession: false } })

    // Valida o token do usuário chamador
    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Token inválido.' }, 401)

    const { data: caller } = await admin.from('profiles').select('papel').eq('id', user.id).single()
    if (caller?.papel !== 'aprovador') return json({ error: 'Apenas gestor pode executar esta operação.' }, 403)

    const body = await req.json()
    const { action } = body

    // ── Criar funcionário ────────────────────────────────────────────────────
    if (action === 'criar') {
      const { nome, email, senha, papel, estado_base } = body

      if (!nome || !email || !senha || !papel) return json({ error: 'Campos obrigatórios: nome, email, senha, papel.' }, 400)
      if (!EMAIL_RE.test(email)) return json({ error: 'E-mail inválido.' }, 400)
      if (String(senha).length < 8) return json({ error: 'Senha deve ter ao menos 8 caracteres.' }, 400)
      if (!PAPEIS_VALIDOS.includes(papel)) return json({ error: 'Papel inválido.' }, 400)

      // Cria o usuário no Auth
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      })
      if (createErr) return json({ error: createErr.message }, 400)

      // Insere o perfil
      const { error: profileErr } = await admin.from('profiles').insert({
        id: created.user.id,
        nome,
        email,
        papel,
        estado_base: estado_base || null,
        ativo: true,
      })
      if (profileErr) {
        // Desfaz a criação do Auth para não deixar usuário órfão
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileErr.message }, 400)
      }

      return json({ ok: true })
    }

    // ── Atualizar funcionário (papel, estado, ativo) ─────────────────────────
    if (action === 'atualizar') {
      const { user_id, papel, estado_base, ativo } = body
      if (!user_id) return json({ error: 'user_id é obrigatório.' }, 400)
      if (papel !== undefined && !PAPEIS_VALIDOS.includes(papel)) return json({ error: 'Papel inválido.' }, 400)
      const updates: Record<string, unknown> = {}
      if (papel     !== undefined) updates.papel      = papel
      if (estado_base !== undefined) updates.estado_base = estado_base
      if (ativo     !== null && ativo !== undefined) updates.ativo = ativo

      const { error } = await admin.from('profiles').update(updates).eq('id', user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ── Resetar senha ────────────────────────────────────────────────────────
    if (action === 'resetar_senha') {
      const { user_id, senha } = body
      if (!user_id) return json({ error: 'user_id é obrigatório.' }, 400)
      if (!senha || String(senha).length < 8) return json({ error: 'Senha deve ter ao menos 8 caracteres.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: senha })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Ação desconhecida.' }, 400)

  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
