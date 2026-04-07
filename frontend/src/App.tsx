import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type ConnectionStatus = {
  state: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
  lastUpdatedAt: string;
  lastError?: string;
};

type MessageLog = {
  id: number;
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
};

const API_BASE = '/api';

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [number, setNumber] = useState('');
  const [text, setText] = useState('');
  const [recentMessages, setRecentMessages] = useState<MessageLog[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch(`${API_BASE}/whatsapp/status`);
      const data = (await response.json()) as ConnectionStatus;
      setStatus(data);
    } catch {
      setFeedback('Não foi possível consultar o status da conexão.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadRecentMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/messages/recent?limit=10`);
      const payload = (await response.json()) as { data: MessageLog[] };
      setRecentMessages(payload.data ?? []);
    } catch {
      setFeedback('Não foi possível carregar os últimos envios.');
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/whatsapp/connect`, {
        method: 'POST'
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: { message?: string } };
        throw new Error(payload.error?.message ?? 'Falha ao iniciar conexão.');
      }

      setFeedback('Solicitação de conexão enviada. Verifique o status.');
      await loadStatus();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao iniciar conexão.');
    }
  }, [loadStatus]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoadingSend(true);
      setFeedback(null);

      try {
        const response = await fetch(`${API_BASE}/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ number, text })
        });

        const payload = (await response.json()) as {
          message?: string;
          error?: { message?: string };
        };

        if (!response.ok) {
          throw new Error(payload.error?.message ?? 'Falha ao enviar mensagem.');
        }

        setFeedback(payload.message ?? 'Mensagem enviada com sucesso.');
        setText('');
        await loadRecentMessages();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Falha ao enviar mensagem.');
        await loadRecentMessages();
      } finally {
        setLoadingSend(false);
      }
    },
    [number, text, loadRecentMessages]
  );

  useEffect(() => {
    void loadStatus();
    void loadRecentMessages();
  }, [loadStatus, loadRecentMessages]);

  const statusLabel = useMemo(() => {
    if (!status) return 'carregando';
    return status.state;
  }, [status]);

  return (
    <main className="page">
      <section className="card">
        <h1>Ponto Auto Msg</h1>
        <h2>Status da conexão</h2>
        <p>
          Estado: <strong>{statusLabel}</strong>
        </p>
        <p>Conectado: {status?.isConnected ? 'Sim' : 'Não'}</p>
        <button type="button" onClick={() => void handleConnect()}>
          Iniciar conexão
        </button>
        <button type="button" onClick={() => void loadStatus()} disabled={loadingStatus}>
          {loadingStatus ? 'Atualizando...' : 'Atualizar status'}
        </button>
        {status?.lastError ? <p className="error">Erro: {status.lastError}</p> : null}
      </section>

      <section className="card">
        <h2>Envio manual</h2>
        <form onSubmit={(event) => void handleSubmit(event)} className="form">
          <label>
            Número
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="5511999999999"
              required
            />
          </label>

          <label>
            Texto
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Digite a mensagem"
              required
            />
          </label>

          <button type="submit" disabled={loadingSend}>
            {loadingSend ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </form>

        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>

      <section className="card">
        <h2>Últimos envios</h2>
        {recentMessages.length === 0 ? (
          <p>Nenhum envio registrado.</p>
        ) : (
          <ul className="list">
            {recentMessages.map((item) => (
              <li key={item.id}>
                <p>
                  <strong>#{item.id}</strong> • {item.destinationNumber} •{' '}
                  {new Date(item.sentAt).toLocaleString('pt-BR')}
                </p>
                <p>{item.content}</p>
                <p>
                  Status: <strong>{item.status}</strong>
                  {item.errorMessage ? ` • Erro: ${item.errorMessage}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
