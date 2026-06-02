import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webPush from "https://esm.sh/web-push@3.6.7";

// 1. Configuração com as chaves em formato de String pura (Texto)
webPush.setVapidDetails(
    'mailto:abrunos57@gmail.com', 
    'BHU3N0EE3mt78aRtRIhu_UXJsQGj6Ulu_0ZwEj5tgnO6NPIGDtyYaEDkiRP6XDWV93L4Jy2zKfQvhDI3zgil3WU', // Entre aspas simples e sem o Deno.env
    'pWx5Fa4LaF_ub_VjKo1pQSuVKzwxoYgL-B4YD2ah0E4'  // Entre aspas simples e sem o Deno.env
);

serve(async (req) => {
    try {
        const payload = await req.json();

        // 2. Trava de segurança: Executa apenas se for uma INSERÇÃO na tabela agendamentos
        if (payload.type === 'INSERT' && payload.table === 'agendamentos') {
            const novoAgendamento = payload.record;

            // Formata o nome para ficar amigável na tela bloqueada
            const nomeStr = novoAgendamento.cliente_nome || "Cliente";
            const primeiroNome = nomeStr.trim().split(" ")[0];

            const mensagem = `Novo corte agendado! ${primeiroNome} reservou para às ${novoAgendamento.horario}h.`;

            // 3. Conecta no Supabase como Administrador (Service Role)
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );

            const { data: inscricoes, error } = await supabase
                .from('inscricoes_push')
                .select('subscricao');

            if (error) throw error;

            // 4. Dispara a notificação
            const promises = inscricoes.map(insc => {
                return webPush.sendNotification(
                    insc.subscricao,
                    JSON.stringify({ titulo: 'ClientFlow ✂️', msg: mensagem })
                ).catch(e => {
                    console.error("Erro ao enviar para um dispositivo:", e);
                });
            });

            await Promise.all(promises);
            return new Response(JSON.stringify({ success: true, disparos: inscricoes.length }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response("Ignorado, não é um INSERT válido.", { status: 200 });
    } catch (err) {
        return new Response(err.message, { status: 500 });
    }
});