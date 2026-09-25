import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER"); // Ex: whatsapp:+14155238886
const TO_WHATSAPP_NUMBER = Deno.env.get("TO_WHATSAPP_NUMBER");         // Ex: whatsapp:+5585999999999

interface InterrupcaoPayload {
  record: {
    id: string;
    operacao_id: string;
    equipamento_id?: string;
    tipo: string;
    descricao?: string;
    inicio: string;
  };
}

serve(async (req) => {
  try {
    const payload: InterrupcaoPayload = await req.json();
    const record = payload.record;

    // Formatar tipo de parada e horário
    const tipoFormatado = record.tipo.replace(/_/g, " ").toUpperCase();
    const dataHora = new Date(record.inicio).toLocaleString("pt-BR", {
      timeZone: "America/Fortaleza",
    });

    // Mensagem formatada para o WhatsApp
    const mensagem = `🚨 *ALERTA DE PARALISAÇÃO OPERACIONAL* 🚨\n\n` +
      `📌 *Motivo:* ${tipoFormatado}\n` +
      `🕒 *Início:* ${dataHora}\n` +
      `📝 *Detalhes:* ${record.descricao || "Sem observações"}\n\n` +
      `⚡ *Acompanhe a mitigação no Cockpit Executivo.*`;

    // Endpoint da API Twilio
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Parâmetros no formato x-www-form-urlencoded requisitado pela Twilio
    const formData = new URLSearchParams();
    formData.append("From", TWILIO_WHATSAPP_NUMBER!);
    formData.append("To", TO_WHATSAPP_NUMBER!);
    formData.append("Body", mensagem);

    // Autenticação BasicAuth usando as credenciais da Twilio
    const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": authHeader,
      },
      body: formData.toString(),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});