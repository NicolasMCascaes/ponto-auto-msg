import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  reconnectScheduled?: boolean;
};

export type WhatsappSendMessageResult = {
  jid: string;
  messageId: string;
};

type DisconnectDetails = {
  code: number;
  message?: string;
};

const serviceDir = dirname(fileURLToPath(import.meta.url));
const backendRootDir = resolve(serviceDir, '../..');
const authDir = resolve(backendRootDir, '.baileys_auth');
const reconnectableDisconnectCodes = new Set<number>([
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.timedOut,
  DisconnectReason.restartRequired
]);

class WhatsappSessionService {
  private status: WhatsappSessionStatus = {
    state: 'idle',
    isConnected: false,
    lastUpdatedAt: new Date().toISOString(),
    reconnectScheduled: false
  };

  private socket?: ReturnType<typeof makeWASocket>;
  private reconnectTimer?: NodeJS.Timeout;
  private isStarting = false;
  private shouldReconnect = false;
  private connectionGeneration = 0;

  async startConnection(): Promise<WhatsappSessionStatus> {
    this.shouldReconnect = true;

    if (
      this.isStarting ||
      (this.status.state === 'connecting' &&
        (Boolean(this.socket) || Boolean(this.reconnectTimer) || this.status.reconnectScheduled))
    ) {
      return this.getStatus();
    }

    if (this.status.state === 'connected') {
      return this.getStatus();
    }

    return this.initializeSocket();
  }

  async resetConnection(): Promise<WhatsappSessionStatus> {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    const currentSocket = this.socket;
    this.socket = undefined;

    if (currentSocket) {
      currentSocket.ev.removeAllListeners('creds.update');
      currentSocket.ev.removeAllListeners('connection.update');

      try {
        await currentSocket.logout();
      } catch {
        // Ignora falhas de logout local para permitir limpeza da sessao.
      }

      try {
        currentSocket.end(new Error('Sessao reiniciada manualmente.'));
      } catch {
        // Socket pode ja estar encerrado neste ponto.
      }
    }

    if (existsSync(authDir)) {
      rmSync(authDir, { recursive: true, force: true });
    }

    this.updateStatus({
      state: 'idle',
      isConnected: false,
      lastError: undefined,
      lastDisconnectCode: undefined,
      qr: undefined,
      reconnectScheduled: false
    });

    return this.getStatus();
  }

  async sendTextMessage(number: string, text: string): Promise<WhatsappSendMessageResult> {
    if (!this.socket || !this.status.isConnected) {
      throw new Error('Sessao WhatsApp nao esta conectada. Conecte antes de enviar mensagens.');
    }

    const jid = `${number}@s.whatsapp.net`;
    const sentMessage = await this.socket.sendMessage(jid, { text });

    if (!sentMessage?.key?.id) {
      throw new Error('Mensagem enviada sem identificador de confirmacao.');
    }

    return {
      jid,
      messageId: sentMessage.key.id
    };
  }

  getStatus(): WhatsappSessionStatus {
    return { ...this.status };
  }

  private async initializeSocket(): Promise<WhatsappSessionStatus> {
    this.isStarting = true;
    this.clearReconnectTimer();
    this.connectionGeneration += 1;
    const generation = this.connectionGeneration;

    this.updateStatus({
      state: 'connecting',
      isConnected: false,
      lastError: undefined,
      lastDisconnectCode: undefined,
      qr: undefined,
      reconnectScheduled: false
    });

    try {
      mkdirSync(authDir, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      const socket = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: false
      });

      this.socket = socket;

      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        if (generation !== this.connectionGeneration) {
          return;
        }

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.updateStatus({
            state: 'connecting',
            isConnected: false,
            qr,
            reconnectScheduled: false
          });
        }

        if (connection === 'open') {
          this.clearReconnectTimer();
          this.updateStatus({
            state: 'connected',
            isConnected: true,
            lastError: undefined,
            lastDisconnectCode: undefined,
            qr: undefined,
            reconnectScheduled: false
          });
        }

        if (connection === 'close') {
          const details = this.getDisconnectDetails(lastDisconnect?.error);
          const isLoggedOut = details.code === DisconnectReason.loggedOut;
          const canReconnect =
            this.shouldReconnect && !isLoggedOut && reconnectableDisconnectCodes.has(details.code);

          if (this.socket === socket) {
            this.socket = undefined;
          }

          if (canReconnect) {
            this.updateStatus({
              state: 'connecting',
              isConnected: false,
              lastDisconnectCode: details.code,
              lastError:
                details.message ??
                'Conexao interrompida temporariamente. Tentando recuperar a sessao.',
              qr: undefined,
              reconnectScheduled: true
            });

            this.scheduleReconnect(details.code === DisconnectReason.restartRequired ? 250 : 1_500);
            return;
          }

          this.updateStatus({
            state: isLoggedOut ? 'error' : 'disconnected',
            isConnected: false,
            lastDisconnectCode: details.code,
            qr: undefined,
            reconnectScheduled: false,
            lastError: isLoggedOut
              ? 'Sessao desconectada (logged out). Gere uma nova sessao para autenticar novamente.'
              : details.message ?? 'Sessao desconectada.'
          });
        }
      });

      return this.getStatus();
    } catch (error) {
      this.updateStatus({
        state: 'error',
        isConnected: false,
        lastDisconnectCode: undefined,
        qr: undefined,
        reconnectScheduled: false,
        lastError: error instanceof Error ? error.message : 'Falha ao iniciar sessao WhatsApp'
      });

      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  private scheduleReconnect(delayMs: number): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      void this.initializeSocket().catch(() => {
        // O erro ja e refletido no status do servico.
      });
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private getDisconnectDetails(error: unknown): DisconnectDetails {
    const maybeError = error as
      | {
          message?: string;
          output?: { statusCode?: number; payload?: { message?: string } };
          data?: { reason?: string };
        }
      | undefined;

    const code = Number(maybeError?.output?.statusCode ?? 0);
    const message =
      maybeError?.output?.payload?.message ??
      maybeError?.message ??
      maybeError?.data?.reason;

    return {
      code,
      message
    };
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
