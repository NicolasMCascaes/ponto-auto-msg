import { useEffect, useState } from 'react';
import { QrCodeIcon, RefreshCwIcon, RotateCcwIcon, SmartphoneIcon } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useAppData } from '@/providers/app-data-provider';
import {
  formatDateTime,
  getConnectionBadgeVariant,
  getConnectionLabel
} from '@/lib/formatters';

export function SessionPage() {
  const { status, connectWhatsapp, refreshStatus, resetWhatsapp } = useAppData();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!status?.qr) {
      setQrCodeUrl(null);
      return () => {
        isMounted = false;
      };
    }

    void toDataURL(status.qr, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f4c3a',
        light: '#fff8f0'
      }
    })
      .then((url: string) => {
        if (isMounted) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQrCodeUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [status?.qr]);

  async function handleConnect() {
    setIsStarting(true);

    try {
      const payload = await connectWhatsapp();
      toast.success(payload.message ?? 'Conexao iniciada. Leia o QR no celular.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar a conexao.');
    } finally {
      setIsStarting(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);

    try {
      await refreshStatus();
      toast.success('Status atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar status.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleReset() {
    setIsResetting(true);

    try {
      const payload = await resetWhatsapp();
      toast.success(payload.message ?? 'Sessao reiniciada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao resetar a sessao.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sessao WhatsApp"
        title="Controle completo da autenticacao"
        description="Leia o QR, acompanhe reconexao automatica e reinicie a sessao quando precisar limpar o pairing."
        actions={
          <>
            <Button onClick={() => void handleConnect()} disabled={status?.isConnected || isStarting}>
              <QrCodeIcon className="size-4" />
              {isStarting ? 'Gerando QR...' : 'Conectar'}
            </Button>
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing}>
              <RefreshCwIcon className="size-4" />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button variant="outline" onClick={() => void handleReset()} disabled={isResetting}>
              <RotateCcwIcon className="size-4" />
              {isResetting ? 'Reiniciando...' : 'Resetar'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Estado atual</CardDescription>
            <CardTitle className="flex flex-wrap items-center gap-3">
              {getConnectionLabel(status ?? undefined)}
              <Badge variant={getConnectionBadgeVariant(status ?? undefined)}>
                {status?.state ?? 'idle'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Conectado</p>
                <p className="mt-2 text-lg font-semibold">{status?.isConnected ? 'Sim' : 'Nao'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ultima leitura</p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(status?.lastUpdatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Codigo de desconexao</p>
                <p className="mt-2 text-lg font-semibold">{status?.lastDisconnectCode ?? 'Sem registro'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reconexao automatica</p>
                <p className="mt-2 text-lg font-semibold">{status?.reconnectScheduled ? 'Ativa' : 'Nao pendente'}</p>
              </div>
            </div>

            {status?.lastError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Ultimo erro</p>
                <p className="mt-1 text-destructive/80">{status.lastError}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>QR Code</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <SmartphoneIcon className="size-5 text-primary" />
              Leia com o WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status?.isConnected ? (
              <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-border/70 bg-background/80 p-6 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Sessao conectada com sucesso</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    O QR some automaticamente apos a autenticacao para evitar leitura de um codigo expirado.
                  </p>
                </div>
              </div>
            ) : qrCodeUrl ? (
              <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-6">
                <div className="grid place-items-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR code para conectar o WhatsApp"
                    className="w-full max-w-[18rem] rounded-[1.75rem] border border-border/70 bg-white p-4 shadow-sm"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Abra o WhatsApp no celular, entre em Dispositivos conectados e leia este codigo.
                </p>
              </div>
            ) : (
              <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-dashed border-border bg-background/80 p-6 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {status?.state === 'connecting' ? 'Aguardando QR valido' : 'Nenhum QR ativo'}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Inicie a conexao para gerar um QR code novo ou use o reset caso queira limpar a autenticacao atual.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
