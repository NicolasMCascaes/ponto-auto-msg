import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type BaileysEventMap,
  type ConnectionState,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { whatsappAiAutomationService } from './whatsappAiAutomationService.js';

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
  pairingCode?: string;
  pairingPhoneNumber?: string;
  pairingRequestedAt?: string;
  reconnectScheduled?: boolean;
};

export type WhatsappSendMessageResult = {
  jid: string;
  messageId: string;
};

export type WhatsappPairingCodeResult = {
  pairingCode?: string;
  status: WhatsappSessionStatus;
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
  private startPromise?: Promise<WhatsappSessionStatus>;
  private pairingCodeRequest?: Promise<WhatsappPairingCodeResult>;
  private pairingReadyGeneration?: number;
  private pairingReadyWaiters = new Map<number, Array<() => void>>();

  async startConnection(): Promise<WhatsappSessionStatus> {
    this.shouldReconnect = true;

    if (this.startPromise) {
      return this.startPromise;
    }

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

    return this.beginInitializeSocket();
  }

  async resetConnection(): Promise<WhatsappSessionStatus> {
    this.shouldReconnect = false;
    this.clearReconnectTimer();

    const currentSocket = this.socket;
    this.socket = undefined;

    if (currentSocket) {
      currentSocket.ev.removeAllListeners('creds.update');
      currentSocket.ev.removeAllListeners('connection.update');
      currentSocket.ev.removeAllListeners('messages.upsert');

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
      pairingCode: undefined,
      pairingPhoneNumber: undefined,
      pairingRequestedAt: undefined,
      reconnectScheduled: false
    });

    return this.getStatus();
  }

  async requestPairingCode(phoneNumber: string): Promise<WhatsappPairingCodeResult> {
    if (this.pairingCodeRequest) {
      return this.pairingCodeRequest;
    }

    const request = this.createPairingCode(phoneNumber)
      .catch((error) => {
        if (error instanceof Error && error.message === 'Sessao WhatsApp ja esta conectada.') {
          throw error;
        }

        this.updateStatus({
          pairingCode: undefined,
          pairingPhoneNumber: undefined,
          pairingRequestedAt: undefined,
          lastError:
            error instanceof Error
              ? error.message
              : 'Falha ao gerar codigo de pareamento.'
        });

        throw error;
      })
      .finally(() => {
        if (this.pairingCodeRequest === request) {
          this.pairingCodeRequest = undefined;
        }
      });

    this.pairingCodeRequest = request;
    return request;
  }

  async sendTextMessage(number: string, text: string): Promise<WhatsappSendMessageResult> {
    const jid = `${number}@s.whatsapp.net`;
    return this.sendTextMessageToJid(jid, text);
  }

  async sendTextMessageToJid(jid: string, text: string): Promise<WhatsappSendMessageResult> {
    if (!this.socket || !this.status.isConnected) {
      throw new Error('Sessao WhatsApp nao esta conectada. Conecte antes de enviar mensagens.');
    }

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
      pairingCode: undefined,
      pairingPhoneNumber: undefined,
      pairingRequestedAt: undefined,
      reconnectScheduled: false
    });

    try {
      mkdirSync(authDir, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      await this.clearStalePairingCredentials(state.creds, saveCreds);
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
      socket.ev.on(
        'messages.upsert',
        (event: BaileysEventMap['messages.upsert']) => {
          if (generation !== this.connectionGeneration) {
            return;
          }

          void whatsappAiAutomationService.handleMessagesUpsert(event, {
            sendTextMessageToJid: async (jid, text) => {
              await this.sendTextMessageToJid(jid, text);
            }
          });
        }
      );
      socket.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        if (generation !== this.connectionGeneration) {
          return;
        }

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.markPairingReady(generation);
        }

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
            pairingCode: undefined,
            pairingPhoneNumber: undefined,
            pairingRequestedAt: undefined,
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
              pairingCode: undefined,
              pairingPhoneNumber: undefined,
              pairingRequestedAt: undefined,
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
            pairingCode: undefined,
            pairingPhoneNumber: undefined,
            pairingRequestedAt: undefined,
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
        pairingCode: undefined,
        pairingPhoneNumber: undefined,
        pairingRequestedAt: undefined,
        reconnectScheduled: false,
        lastError: error instanceof Error ? error.message : 'Falha ao iniciar sessao WhatsApp'
      });

      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  private beginInitializeSocket(): Promise<WhatsappSessionStatus> {
    if (this.startPromise) {
      return this.startPromise;
    }

    const startPromise = this.initializeSocket().finally(() => {
      if (this.startPromise === startPromise) {
        this.startPromise = undefined;
      }
    });

    this.startPromise = startPromise;
    return startPromise;
  }

  private async createPairingCode(phoneNumber: string): Promise<WhatsappPairingCodeResult> {
    this.shouldReconnect = true;

    if (this.status.isConnected) {
      throw new Error('Sessao WhatsApp ja esta conectada.');
    }

    if (this.startPromise) {
      await this.startPromise;
    }

    if (!this.socket) {
      await this.beginInitializeSocket();
    }

    const socket = this.socket;
    const generation = this.connectionGeneration;

    if (!socket) {
      throw new Error('Nao foi possivel iniciar o socket do WhatsApp para pareamento.');
    }

    if (socket.authState.creds.registered) {
      this.updateStatus({
        pairingCode: undefined,
        pairingPhoneNumber: undefined,
        pairingRequestedAt: undefined
      });

      return {
        status: this.getStatus()
      };
    }

    await this.waitForPairingReady(generation);
    await socket.waitForSocketOpen();

    if (this.status.isConnected || socket.authState.creds.registered) {
      throw new Error('Sessao WhatsApp ja esta conectada.');
    }

    if (this.socket !== socket || generation !== this.connectionGeneration) {
      throw new Error('A conexao mudou enquanto o codigo era gerado. Tente novamente.');
    }

    const pairingCode = await socket.requestPairingCode(phoneNumber);
    const requestedAt = new Date().toISOString();

    this.updateStatus({
      state: 'connecting',
      isConnected: false,
      pairingCode,
      pairingPhoneNumber: phoneNumber,
      pairingRequestedAt: requestedAt,
      reconnectScheduled: false
    });

    return {
      pairingCode,
      status: this.getStatus()
    };
  }

  private async clearStalePairingCredentials(
    creds: Awaited<ReturnType<typeof useMultiFileAuthState>>['state']['creds'],
    saveCreds: () => Promise<void>
  ): Promise<void> {
    if (creds.registered || (!creds.pairingCode && creds.me?.name !== '~')) {
      return;
    }

    creds.pairingCode = undefined;
    creds.me = undefined;
    await saveCreds();
  }

  private waitForPairingReady(generation: number, timeoutMs = 15_000): Promise<void> {
    if (this.pairingReadyGeneration === generation) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout;

      const cleanup = (waiter: () => void): void => {
        clearTimeout(timer);
        const waiters = this.pairingReadyWaiters.get(generation);

        if (!waiters) {
          return;
        }

        const nextWaiters = waiters.filter((item) => item !== waiter);

        if (nextWaiters.length > 0) {
          this.pairingReadyWaiters.set(generation, nextWaiters);
        } else {
          this.pairingReadyWaiters.delete(generation);
        }
      };

      const waiter = (): void => {
        cleanup(waiter);
        resolve();
      };

      timer = setTimeout(() => {
        cleanup(waiter);
        reject(new Error('Tempo esgotado aguardando o WhatsApp liberar o codigo de pareamento.'));
      }, timeoutMs);

      const waiters = this.pairingReadyWaiters.get(generation) ?? [];
      waiters.push(waiter);
      this.pairingReadyWaiters.set(generation, waiters);
    });
  }

  private markPairingReady(generation: number): void {
    this.pairingReadyGeneration = generation;
    const waiters = this.pairingReadyWaiters.get(generation);

    if (!waiters) {
      return;
    }

    this.pairingReadyWaiters.delete(generation);

    for (const waiter of waiters) {
      waiter();
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
