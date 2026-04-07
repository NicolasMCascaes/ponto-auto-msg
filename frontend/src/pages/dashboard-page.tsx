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
import { useAppData } from '@/providers/app-data-provider';
import {
  formatDateTime,
  getConnectionBadgeVariant,
  getConnectionLabel
} from '@/lib/formatters';

export function DashboardPage() {
  const navigate = useNavigate();
  const { contacts, lists, recentMessages, status, isBooting } = useAppData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Visao geral da operacao"
        description="Acompanhe o status da sessao, a agenda cadastrada e o movimento recente antes de partir para o envio."
        actions={
          <>
            <Button onClick={() => navigate('/send')}>
              Ir para envio
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/contacts')}>
              Gerenciar contatos
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Sessao</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {getConnectionLabel(status ?? undefined)}
              <RadioTowerIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={getConnectionBadgeVariant(status ?? undefined)}>{status?.state ?? 'idle'}</Badge>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Contatos cadastrados</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {contacts.length}
              <UsersRoundIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Agenda central pronta para uso em envio individual ou em lote.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Listas ativas</CardDescription>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              {lists.length}
              <MessageSquareIcon className="size-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use listas para agrupar destinatarios e deduplicar o envio em lote.
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Ultimos eventos</CardDescription>
            <CardTitle className="text-lg">{recentMessages.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            O dashboard mostra os envios mais recentes persistidos no SQLite.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Fluxos principais</CardDescription>
            <CardTitle>Atalhos para o trabalho do dia</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4" onClick={() => navigate('/session')}>
              <span className="text-left">
                <span className="block text-sm font-medium">Sessao WhatsApp</span>
                <span className="block text-xs text-muted-foreground">QR code, reset e reconexao</span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4" onClick={() => navigate('/contacts')}>
              <span className="text-left">
                <span className="block text-sm font-medium">Agenda de contatos</span>
                <span className="block text-xs text-muted-foreground">Cadastro, busca e manutencao</span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
            <Button variant="outline" className="h-auto justify-between rounded-2xl px-4 py-4" onClick={() => navigate('/history')}>
              <span className="text-left">
                <span className="block text-sm font-medium">Historico completo</span>
                <span className="block text-xs text-muted-foreground">Filtros por contato, lista e status</span>
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-sm">
          <CardHeader>
            <CardDescription>Atividade recente</CardDescription>
            <CardTitle>Ultimos envios registrados</CardTitle>
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
