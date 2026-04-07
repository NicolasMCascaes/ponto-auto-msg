import { useDeferredValue, useEffect, useState } from 'react';
import { FilterIcon, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type MessageLog } from '@/lib/api';
import { formatDateTime } from '@/lib/formatters';
import { useAppData } from '@/providers/app-data-provider';

function getSendModeLabel(mode: MessageLog['sendMode']) {
  switch (mode) {
    case 'batch':
      return 'Lote';
    case 'contact':
      return 'Contato salvo';
    case 'manual':
    default:
      return 'Numero avulso';
  }
}

export function HistoryPage() {
  const { contacts, lists, loadMessages } = useAppData();
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [listFilter, setListFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    void loadMessages({
      limit: 100,
      search: deferredSearch.trim() || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      contactId: contactFilter === 'all' ? undefined : Number.parseInt(contactFilter, 10),
      listId: listFilter === 'all' ? undefined : Number.parseInt(listFilter, 10)
    })
      .then((data) => {
        if (isMounted) {
          setMessages(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          toast.error(error instanceof Error ? error.message : 'Falha ao carregar historico.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [contactFilter, deferredSearch, listFilter, loadMessages, statusFilter]);

  async function handleRefresh() {
    setIsLoading(true);

    try {
      const data = await loadMessages({
        limit: 100,
        search: deferredSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        contactId: contactFilter === 'all' ? undefined : Number.parseInt(contactFilter, 10),
        listId: listFilter === 'all' ? undefined : Number.parseInt(listFilter, 10)
      });

      setMessages(data);
      toast.success('Historico atualizado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar historico.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Historico"
        title="Linha do tempo completa de envios"
        description="Filtre por contato, lista, status ou texto para revisar tudo o que foi enviado e os erros retornados pelo backend."
        actions={
          <Button variant="outline" onClick={() => void handleRefresh()}>
            <RefreshCwIcon className="size-4" />
            Atualizar historico
          </Button>
        }
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FilterIcon className="size-4 text-primary" />
            Filtros
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por contato, numero ou texto"
            />

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="failed">Falhos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contactFilter} onValueChange={setContactFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Contato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os contatos</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={String(contact.id)}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={listFilter} onValueChange={setListFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Lista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as listas</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={String(list.id)}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Modo</TableHead>
                    <TableHead>Listas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        Nenhum registro encontrado para os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    messages.map((message) => (
                      <TableRow key={message.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDateTime(message.sentAt)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{message.contactName ?? message.destinationNumber}</p>
                            <p className="text-xs text-muted-foreground">{message.destinationNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getSendModeLabel(message.sendMode)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {message.listNames.length === 0 ? (
                              <Badge variant="outline">Sem listas</Badge>
                            ) : (
                              message.listNames.map((listName) => (
                                <Badge key={`${message.id}-${listName}`} variant="outline">
                                  {listName}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={message.status === 'sent' ? 'default' : 'destructive'}>
                            {message.status === 'sent' ? 'Enviado' : 'Falhou'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[28rem]">
                          <div className="space-y-1">
                            <p className="line-clamp-2 text-sm text-foreground">{message.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {message.errorMessage ?? 'Sem erros registrados'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
