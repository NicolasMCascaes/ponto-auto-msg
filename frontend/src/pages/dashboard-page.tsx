import { ArrowRightIcon, MessageSquareIcon, RadioTowerIcon, UsersRoundIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatDateTime,
  getConnectionBadgeVariant,
  getConnectionLabel
} from '@/lib/formatters';
import { useAppData } from '@/providers/app-data-provider';

function getDashboardStatusLabel(state: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | undefined) {
  switch (state) {
    case 'connected':
      return 'Online';
    case 'connecting':
      return 'Conectando';
    case 'disconnected':
      return 'Offline';
    case 'error':
      return 'Atenção';
    case 'idle':
    default:
      return 'Pronto';
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { contacts, lists, recentMessages, status, isBooting } = useAppData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão geral"
        title="Tudo pronto para o próximo envio"
        description="Acompanhe sua conexão, a base de contatos e a atividade recente antes de iniciar uma nova mensagem."
        actions={
          <>
            <Button onClick={() => navigate('/send')}>
              Novo envio
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/contacts')}>
              Abrir agenda
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>WhatsApp</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {getConnectionLabel(status ?? undefined)}
              <RadioTowerIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getConnectionBadgeVariant(status ?? undefined)}>
              {getDashboardStatusLabel(status?.state)}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Contatos na agenda</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {contacts.length}
              <UsersRoundIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sua base está pronta para envios individuais e em lote.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Listas disponíveis</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {lists.length}
              <MessageSquareIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Organize públicos por contexto e evite duplicidade nos lotes.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Atividade recente</CardDescription>
            <CardTitle className="text-lg">{recentMessages.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Os envios mais recentes ficam sempre à mão para consulta rápida.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Acessos rápidos</CardDescription>
            <CardTitle>Entre direto no que importa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="h-auto justify-between rounded-2xl px-4 py-4"
              onClick={() => navigate('/session')}
            >
              <span className="text-left">
                <span className="block text-sm font-medium">Conexão do WhatsApp</span>
                <span className="block text-xs text-muted-foreground">
                  QR Code, atualização e reinício
                </span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between rounded-2xl px-4 py-4"
              onClick={() => navigate('/contacts')}
            >
              <span className="text-left">
                <span className="block text-sm font-medium">Agenda</span>
                <span className="block text-xs text-muted-foreground">
                  Cadastre, edite e organize contatos
                </span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-between rounded-2xl px-4 py-4"
              onClick={() => navigate('/history')}
            >
              <span className="text-left">
                <span className="block text-sm font-medium">Histórico</span>
                <span className="block text-xs text-muted-foreground">
                  Consulte envios, falhas e filtros
                </span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Últimos registros</CardDescription>
            <CardTitle>O que aconteceu por último</CardTitle>
          </CardHeader>
          <CardContent>
            {isBooting ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : recentMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum envio registrado ainda.
              </div>
            ) : (
              <ScrollArea className="h-[22rem] pr-4">
                <div className="space-y-3">
                  {recentMessages.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {item.contactName ?? item.destinationNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.sentAt)}</p>
                        </div>
                        <Badge variant={item.status === 'sent' ? 'default' : 'destructive'}>
                          {item.status === 'sent' ? 'Enviado' : 'Falhou'}
                        </Badge>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
