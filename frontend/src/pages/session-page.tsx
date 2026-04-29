import { useEffect, useState, type FormEvent } from 'react';
import { KeyRoundIcon, QrCodeIcon, RefreshCwIcon, RotateCcwIcon, SmartphoneIcon } from 'lucide-react';
import { toDataURL } from 'qrcode';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { WhatsappAiFeaturePanel } from '@/components/whatsapp-ai-feature-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatDateTime,
  getConnectionBadgeVariant,
  getConnectionLabel
} from '@/lib/formatters';
import { useAppData } from '@/providers/app-data-provider';

const MIN_PAIRING_PHONE_DIGITS = 10;
const MAX_PAIRING_PHONE_DIGITS = 15;

function normalizePairingPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

function formatPairingCode(value?: string): string | null {
  if (!value) {
    return null;
  }

  const cleanValue = value.replace(/\s/g, '');
  return cleanValue.match(/.{1,4}/g)?.join('-') ?? cleanValue;
}

export function SessionPage() {
  const {
    status,
    connectWhatsapp,
    refreshStatus,
    requestWhatsappPairingCode,
    resetWhatsapp
  } = useAppData();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isRequestingPairingCode, setIsRequestingPairingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const formattedPairingCode = formatPairingCode(status?.pairingCode);

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
      toast.success(payload.message ?? 'Conexão iniciada. Leia o QR Code no celular.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao iniciar a conexão.');
    } finally {
      setIsStarting(false);
    }
  }

  async function handleRequestPairingCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPhoneNumber = normalizePairingPhoneNumber(pairingPhoneNumber);

    if (
      normalizedPhoneNumber.length < MIN_PAIRING_PHONE_DIGITS ||
      normalizedPhoneNumber.length > MAX_PAIRING_PHONE_DIGITS
    ) {
      toast.error('Informe DDI + DDD + numero, com 10 a 15 digitos.');
      return;
    }

    setPairingPhoneNumber(normalizedPhoneNumber);
    setIsRequestingPairingCode(true);

    try {
      const payload = await requestWhatsappPairingCode(normalizedPhoneNumber);

      if (payload.pairingCode) {
        toast.success(payload.message ?? 'Codigo gerado. Digite no WhatsApp do celular.');
      } else {
        toast.info(payload.message ?? 'Sessao existente encontrada. Tentando reconectar.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar codigo.');
    } finally {
      setIsRequestingPairingCode(false);
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
      toast.success(payload.message ?? 'Sessão reiniciada.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reiniciar a sessão.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WhatsApp"
        title="Conecte e acompanhe sua sessão"
        description="Leia o QR Code, acompanhe o status da conexão, reinicie a sessão quando precisar e visualize como a automação /4.0 se encaixa no fluxo."
        actions={
          <>
            <Button onClick={() => void handleConnect()} disabled={status?.isConnected || isStarting}>
              <QrCodeIcon className="size-4" />
              {isStarting ? 'Gerando QR...' : 'Gerar QR Code'}
            </Button>
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing}>
              <RefreshCwIcon className="size-4" />
              {isRefreshing ? 'Atualizando...' : 'Atualizar status'}
            </Button>
            <Button variant="outline" onClick={() => void handleReset()} disabled={isResetting}>
              <RotateCcwIcon className="size-4" />
              {isResetting ? 'Reiniciando...' : 'Reiniciar sessão'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Status da conexão</CardDescription>
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
                <p className="mt-2 text-lg font-semibold">{status?.isConnected ? 'Sim' : 'Não'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Última leitura</p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(status?.lastUpdatedAt)}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Código de desconexão</p>
                <p className="mt-2 text-lg font-semibold">{status?.lastDisconnectCode ?? 'Sem registro'}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reconexão automática</p>
                <p className="mt-2 text-lg font-semibold">
                  {status?.reconnectScheduled ? 'Ativa' : 'Não pendente'}
                </p>
              </div>
            </div>

            {status?.lastError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                <p className="font-medium">Último erro</p>
                <p className="mt-1 text-destructive/80">{status.lastError}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Codigo ou QR Code</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <SmartphoneIcon className="size-5 text-primary" />
              Conecte pelo celular
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {status?.isConnected ? (
              <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-border/70 bg-background/80 p-6 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Tudo certo por aqui</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    O QR Code desaparece automaticamente assim que a sessão é confirmada.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <form
                  className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-background/80 p-5"
                  onSubmit={(event) => void handleRequestPairingCode(event)}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="whatsapp-pairing-phone">Numero do WhatsApp</Label>
                    <Input
                      id="whatsapp-pairing-phone"
                      inputMode="numeric"
                      placeholder="5511999999999"
                      value={pairingPhoneNumber}
                      disabled={isRequestingPairingCode}
                      aria-invalid={
                        pairingPhoneNumber.length > 0 &&
                        (normalizePairingPhoneNumber(pairingPhoneNumber).length <
                          MIN_PAIRING_PHONE_DIGITS ||
                          normalizePairingPhoneNumber(pairingPhoneNumber).length >
                            MAX_PAIRING_PHONE_DIGITS)
                      }
                      onChange={(event) => setPairingPhoneNumber(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use DDI + DDD + numero, sem +, espacos ou tracos.
                    </p>
                  </div>

                  <Button type="submit" disabled={isRequestingPairingCode}>
                    <KeyRoundIcon className="size-4" />
                    {isRequestingPairingCode ? 'Gerando codigo...' : 'Gerar codigo'}
                  </Button>

                  {formattedPairingCode ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Codigo para digitar no celular
                      </p>
                      <p className="mt-3 font-mono text-3xl font-semibold tracking-[0.2em] text-foreground">
                        {formattedPairingCode}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        WhatsApp no celular &gt; Dispositivos conectados &gt; Conectar com numero de
                        telefone.
                      </p>
                      {status?.pairingRequestedAt ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Gerado em {formatDateTime(status.pairingRequestedAt)}.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </form>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    fallback por QR
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {qrCodeUrl ? (
              <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-6">
                <div className="grid place-items-center">
                  <img
                    src={qrCodeUrl}
                    alt="QR code para conectar o WhatsApp"
                    className="w-full max-w-[18rem] rounded-[1.75rem] border border-border/70 bg-white p-4 shadow-sm"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Abra o WhatsApp no celular, entre em Dispositivos conectados e escaneie este código.
                </p>
              </div>
            ) : (
              <div className="grid min-h-[22rem] place-items-center rounded-3xl border border-dashed border-border bg-background/80 p-6 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">
                    {status?.state === 'connecting' ? 'Preparando QR Code' : 'Nenhum QR Code disponível'}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Gere um novo QR Code para conectar sua conta ou reinicie a sessão para começar do zero.
                  </p>
                </div>
              </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <WhatsappAiFeaturePanel isWhatsappConnected={Boolean(status?.isConnected)} />
    </div>
  );
}
