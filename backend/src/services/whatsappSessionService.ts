import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type ConnectionState,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

export type WhatsappConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type WhatsappSessionStatus = {
  state: WhatsappConnectionState;
  isConnected: boolean;
  lastUpdatedAt: string;
  lastError?: string;
  lastDisconnectCode?: number;
  qr?: string;
};

export type WhatsappSendMessageResult = {
  jid: string;
  messageId: string;
};

class WhatsappSessionService {
  private status: WhatsappSessionStatus = {
    state: 'idle',
    isConnected: false,
    lastUpdatedAt: new Date().toISOString()
  };

  private socket?: ReturnType<typeof makeWASocket>;

  async startConnection(): Promise<WhatsappSessionStatus> {
    if (this.status.state === 'connecting' || this.status.state === 'connected') {
      return this.getStatus();
    }

    this.updateStatus({
      state: 'connecting',
      isConnected: false,
      lastError: undefined,
      qr: undefined
    });

    try {
      const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');
      const { version } = await fetchLatestBaileysVersion();

      this.socket = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: false
      });

      this.socket.ev.on('creds.update', saveCreds);
      this.socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.updateStatus({
            state: 'connecting',
            isConnected: false,
            qr
          });
        }

        if (connection === 'open') {
          this.updateStatus({
            state: 'connected',
            isConnected: true,
            lastError: undefined,
            lastDisconnectCode: undefined,
            qr: undefined
          });
        }

        if (connection === 'close') {
          const disconnectCode = Number(
            (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output
              ?.statusCode ?? 0
          );
          const isLoggedOut = disconnectCode === DisconnectReason.loggedOut;

          this.socket = undefined;
          this.updateStatus({
            state: isLoggedOut ? 'error' : 'disconnected',
            isConnected: false,
            lastDisconnectCode: disconnectCode,
            lastError: isLoggedOut
              ? 'Sessão desconectada (logged out). Reautenticação necessária.'
              : 'Sessão desconectada.'
          });

          // Estrutura preparada para futura estratégia de reconexão.
          // Nesta fase do MVP não executamos reconexões automáticas.
        }
      });

      return this.getStatus();
    } catch (error) {
      this.updateStatus({
        state: 'error',
        isConnected: false,
        lastError: error instanceof Error ? error.message : 'Falha ao iniciar sessão WhatsApp'
      });

      throw error;
    }
  }

  async sendTextMessage(number: string, text: string): Promise<WhatsappSendMessageResult> {
    if (!this.socket || !this.status.isConnected) {
      throw new Error('Sessão WhatsApp não está conectada. Conecte antes de enviar mensagens.');
    }

    const jid = `${number}@s.whatsapp.net`;
    const sentMessage = await this.socket.sendMessage(jid, { text });

    if (!sentMessage?.key?.id) {
      throw new Error('Mensagem enviada sem identificador de confirmação.');
    }

    return {
      jid,
      messageId: sentMessage.key.id
    };
  }

  getStatus(): WhatsappSessionStatus {
    return { ...this.status };
  }

  private updateStatus(partial: Partial<WhatsappSessionStatus>): void {
    this.status = {
      ...this.status,
      ...partial,
      lastUpdatedAt: new Date().toISOString()
    };
  }
}

export const whatsappSessionService = new WhatsappSessionService();
