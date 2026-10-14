// =====================================
// SALVAR TODA A ALTERAÇÃO DO DIA (OBRIGATÓRIO) 
// =====================================
// git add .
// git commit -m "Explique o que você fez hoje, como se fosse um comentário"
// git push
// =====================================
// IMPORTAÇÕES
// =====================================
const path = require("path");
const os = require("os");
const qrcode = require("qrcode-terminal");
const { Client, MessageMedia, LocalAuth } = require("whatsapp-web.js");

// Adaptação para Windows: o Chromium ativo mantém arquivos como 'lockfile' abertos.
// Essa classe evita que o Node caia com EBUSY ao renovar o QR Code ou ao receber LOGOUT.
class SafeLocalAuth extends LocalAuth {
  async logout() {
    if (this.userDataDir) {
      try {
        await super.logout();
      } catch (e) {
        const msg = e && (e.message || String(e));
        if (msg.includes("EBUSY") || msg.includes("EPERM") || msg.includes("resource busy")) {
          return;
        }
        console.warn("⚠️ Aviso ao limpar sessão:", msg);
      }
    }
  }
}

// Protege contra quedas quando o WhatsApp Web redireciona durante avaliações internas do Puppeteer
Client.prototype._registerFramenavigatedHandler = function () {
  if (this._framenavigatedRegistered) return;
  this._framenavigatedRegistered = true;

  this.pupPage.on("framenavigated", async (frame) => {
    if (frame.parentFrame() !== null) return;

    const isLogout =
      frame.url().includes("post_logout=1") || this.lastLoggedOut;

    if (isLogout) {
      this.emit("disconnected", "LOGOUT");
      try {
        await this.authStrategy.logout();
      } catch (e) {}
      try {
        await this.authStrategy.beforeBrowserInitialized();
        await this.authStrategy.afterBrowserInitialized();
      } catch (e) {}
      this.lastLoggedOut = false;
    }

    try {
      const storeAvailable = await this.pupPage.evaluate(() => {
        return typeof window.WWebJS !== "undefined";
      });

      if (!isLogout && storeAvailable) return;

      await this.inject();
    } catch (err) {
      // Ignora erro de contexto destruído caso a página ainda esteja navegando
    }
  });
};

// Evita que erros pontuais de rede/navegação do Puppeteer fechem o bot
process.on("unhandledRejection", (err) => {
  if (
    err &&
    err.message &&
    (err.message.includes("Execution context was destroyed") ||
      err.message.includes("Target closed") ||
      err.message.includes("Session closed"))
  ) {
    return;
  }
  console.error("⚠️ Erro assíncrono capturado:", err);
});

// =====================================
// CONFIGURAÇÃO DO CLIENTE
// =====================================
const client = new Client({
  authStrategy: new SafeLocalAuth({
    dataPath: path.join(os.homedir(), ".wwebjs_auth_chatbot"),
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
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