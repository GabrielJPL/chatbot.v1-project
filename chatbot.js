// =====================================
// SALVAR TODA A ALTERAÇÃO DO DIA (OBRIGATÓRIO) 
// =====================================
// git add .
// git commit -m "Explique o que você fez hoje, como se fosse um comentário"
// git push
// =====================================
// IMPORTAÇÕES
// =====================================
const qrcode = require("qrcode-terminal");
const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");

// =====================================
// CONFIGURAÇÃO DO CLIENTE
// =====================================
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  },
});

// =====================================
// QR CODE
// =====================================
client.on("qr", (qr) => {
  console.log("📲 Escaneie o QR Code abaixo:");
  qrcode.generate(qr, { small: true });
});

// =====================================
// WHATSAPP CONECTADO
// =====================================
client.on("ready", () => {
  console.log("✅ Tudo certo! WhatsApp conectado.");
});

// =====================================
// DESCONEXÃO
// =====================================
client.on("disconnected", (reason) => {
  console.log("⚠️ Desconectado!:", reason);
});

// =====================================
// INICIALIZA
// =====================================
client.initialize();

// =====================================
// FUNÇÃO DE DELAY
// =====================================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// =====================================
// FUNIL DE MENSAGENS (SOMENTE PRIVADO)
// =====================================
client.on("message", async (msg) => {
  try {
    // ❌ IGNORA QUALQUER COISA QUE NÃO SEJA CONVERSA PRIVADA
    if (!msg.from || msg.from.endsWith("@g.us") || msg.author || msg.from.includes("@broadcast") || msg.from.includes("@newsletter")) return;

    const texto = msg.body ? msg.body.trim().toLowerCase() : "";

    // Função de digitação segura (sem quebrar se a API do WhatsApp Web oscilar)
    const typing = async () => {
      await delay(3000);
      try {
        await client.pupPage.evaluate((chatId) => {
          if (window.WWebJS && typeof window.WWebJS.sendChatstate === "function") {
            window.WWebJS.sendChatstate("typing", chatId);
          }
        }, msg.from);
      } catch (e) {
        // Ignora caso a versão web do WhatsApp não suporte o estado de digitação no momento
      }
      await delay(1500);
    };

    // =====================================
    // MENSAGEM INICIAL
    // =====================================
    if (/^(menu|oi|olá|ola|bom dia|boa tarde|boa noite)$/i.test(texto)) {

      await typing();

      const hora = new Date().getHours();
      let saudacao = "Olá";

      if (hora >= 5 && hora < 12) saudacao = "Bom dia";
      else if (hora >= 12 && hora < 18) saudacao = "Boa tarde";
      else saudacao = "Boa noite";

      const mensagemBoasVindas =
        `*${saudacao}!* 👋 Seja bem-vindo à *DeepDevs*.

Somos especializados em soluções digitais completas para impulsionar seu negócio e presença online.

Como podemos ajudar você hoje?

━━━━━━━━━━━━━━━━━━━━━
📌 *Nossos Serviços:*
━━━━━━━━━━━━━━━━━━━━━

🌐 *1 - Desenvolvimento de Sites*
Sites modernos, de alta performance, responsivos e otimizados para converter visitantes em clientes.

🤖 *2 - Chatbots & Automações*
Atenda seus clientes 24 horas por dia, 7 dias por semana no WhatsApp, sem perder nenhuma oportunidade.

☁️ *3 - Hospedagem & Infraestrutura*
Hospedamos e cuidamos de toda a estabilidade técnica dos seus projetos para você focar no seu negócio.

━━━━━━━━━━━━━━━━━━━━━
🌐 *Acesse nosso site oficial:*
https://deepdevs.site
━━━━━━━━━━━━━━━━━━━━━`;

      await client.sendMessage(msg.from, mensagemBoasVindas);

    }


  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error);
  }
});
// =====================================
// COMANDOS IMPORTANTES
// =====================================
// CRTL + C = Finaliza o script
// Node + "nome do arquivo" = Inicia o script
// =====================================