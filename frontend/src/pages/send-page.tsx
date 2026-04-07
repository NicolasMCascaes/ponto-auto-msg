import { useMemo, useState } from 'react';
import { AlertTriangleIcon, MessageCircleIcon, SendHorizonalIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAppData } from '@/providers/app-data-provider';
import { normalizeNumberPreview } from '@/lib/formatters';

export function SendPage() {
  const { contacts, lists, status, sendBatch, sendSingle } = useAppData();
  const [singleMode, setSingleMode] = useState<'contact' | 'manual'>('contact');
  const [singleContactId, setSingleContactId] = useState<string>('none');
  const [manualNumber, setManualNumber] = useState('');
  const [singleText, setSingleText] = useState('');
  const [batchText, setBatchText] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);

  const activeContacts = useMemo(() => contacts.filter((contact) => contact.isActive), [contacts]);

  const batchTargets = useMemo(() => {
    const targets = new Map<number, (typeof activeContacts)[number]>();

    for (const contact of activeContacts) {
      if (selectedContactIds.includes(contact.id)) {
        targets.set(contact.id, contact);
        continue;
      }

      if (contact.listIds.some((listId) => selectedListIds.includes(listId))) {
        targets.set(contact.id, contact);
      }
    }

    return [...targets.values()];
  }, [activeContacts, selectedContactIds, selectedListIds]);

  function toggleContact(contactId: number) {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((item) => item !== contactId)
        : [...current, contactId]
    );
  }

  function toggleList(listId: number) {
    setSelectedListIds((current) =>
      current.includes(listId) ? current.filter((item) => item !== listId) : [...current, listId]
    );
  }

  async function handleSingleSend() {
    setIsSendingSingle(true);

    try {
      if (singleMode === 'contact') {
        const parsedContactId = Number.parseInt(singleContactId, 10);

        if (!Number.isInteger(parsedContactId) || parsedContactId <= 0) {
          throw new Error('Selecione um contato ativo antes de enviar.');
        }

        const payload = await sendSingle({
          contactId: parsedContactId,
          text: singleText
        });
        toast.success(payload.message ?? 'Mensagem enviada com sucesso.');
      } else {
        const payload = await sendSingle({
          number: manualNumber,
          text: singleText
        });
        toast.success(payload.message ?? 'Mensagem enviada com sucesso.');
      }

      setSingleText('');
      if (singleMode === 'manual') {
        setManualNumber('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar mensagem.');
    } finally {
      setIsSendingSingle(false);
    }
  }

  async function handleBatchSend() {
    setIsSendingBatch(true);

    try {
      const payload = await sendBatch({
        text: batchText,
        contactIds: selectedContactIds,
        listIds: selectedListIds
      });

      toast.success(
        payload.message ??
          `Lote concluido. ${payload.data.successCount} enviado(s), ${payload.data.failedCount} falha(s).`
      );
      setBatchText('');
      setSelectedContactIds([]);
      setSelectedListIds([]);
      setIsBatchConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar lote.');
    } finally {
      setIsSendingBatch(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Envio"
        title="Disparo individual ou em lote"
        description="Escolha um contato salvo, informe um numero avulso ou monte um lote com contatos e listas ao mesmo tempo."
      />

      {!status?.isConnected ? (
        <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">Sessao WhatsApp desconectada</p>
              <p className="mt-1 text-destructive/80">
                Conecte a sessao na aba correspondente antes de tentar enviar mensagens.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="single" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single">Individual</TabsTrigger>
          <TabsTrigger value="batch">Em lote</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardDescription>Destino</CardDescription>
                <CardTitle>Escolha como enviar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-2">
                  <Label>Modo de destino</Label>
                  <Select value={singleMode} onValueChange={(value) => setSingleMode(value as typeof singleMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contato salvo</SelectItem>
                      <SelectItem value="manual">Numero avulso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {singleMode === 'contact' ? (
                  <div className="grid gap-2">
                    <Label>Contato</Label>
                    <Select value={singleContactId} onValueChange={setSingleContactId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um contato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione um contato</SelectItem>
                        {activeContacts.map((contact) => (
                          <SelectItem key={contact.id} value={String(contact.id)}>
                            {contact.name} • {contact.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="manual-number">Numero avulso</Label>
                    <Input
                      id="manual-number"
                      value={manualNumber}
                      onChange={(event) => setManualNumber(event.target.value)}
                      placeholder="5511999999999"
                    />
                    <p className="text-xs text-muted-foreground">
                      Destino atual: {normalizeNumberPreview(manualNumber)}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  {singleMode === 'contact'
                    ? 'O envio usa um contato ja salvo na agenda e reaproveita os mesmos dados no historico.'
                    : 'O envio avulso nao cria contato automaticamente. Use a agenda quando quiser reutilizar o numero.'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardDescription>Mensagem</CardDescription>
                <CardTitle>Composer individual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="single-text">Texto</Label>
                  <Textarea
                    id="single-text"
                    value={singleText}
                    onChange={(event) => setSingleText(event.target.value)}
                    placeholder="Escreva a mensagem a ser enviada."
                    className="min-h-48"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{singleText.length}/500 caracteres</p>
                </div>

                <Button
                  className="w-full"
                  onClick={() => void handleSingleSend()}
                  disabled={!status?.isConnected || isSendingSingle}
                >
                  <SendHorizonalIcon className="size-4" />
                  {isSendingSingle ? 'Enviando...' : 'Enviar mensagem'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardDescription>Destinatarios</CardDescription>
                <CardTitle>Monte o lote</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contatos ativos</Label>
                    <Badge variant="secondary">{selectedContactIds.length} selecionado(s)</Badge>
                  </div>
                  <ScrollArea className="h-72 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-3">
                      {activeContacts.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-3"
                        >
                          <Checkbox
                            checked={selectedContactIds.includes(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.number}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Listas</Label>
                    <Badge variant="secondary">{selectedListIds.length} selecionada(s)</Badge>
                  </div>
                  <ScrollArea className="h-72 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-3">
                      {lists.map((list) => (
                        <label
                          key={list.id}
                          className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-3"
                        >
                          <Checkbox
                            checked={selectedListIds.includes(list.id)}
                            onCheckedChange={() => toggleList(list.id)}
                          />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{list.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {list.memberCount} membro(s)
                              {list.description ? ` • ${list.description}` : ''}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardDescription>Resumo do lote</CardDescription>
                <CardTitle>Composer em lote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contatos</p>
                    <p className="mt-2 text-xl font-semibold">{selectedContactIds.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Listas</p>
                    <p className="mt-2 text-xl font-semibold">{selectedListIds.length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Destino final</p>
                    <p className="mt-2 text-xl font-semibold">{batchTargets.length}</p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="batch-text">Mensagem do lote</Label>
                  <Textarea
                    id="batch-text"
                    value={batchText}
                    onChange={(event) => setBatchText(event.target.value)}
                    placeholder="Escreva a mensagem que sera replicada para todos os destinos deduplicados."
                    className="min-h-44"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{batchText.length}/500 caracteres</p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <UsersIcon className="size-4 text-primary" />
                    Destinos deduplicados
                  </div>
                  <p className="mt-2">
                    O backend remove duplicidades automaticamente quando o mesmo contato aparece em mais de uma lista selecionada.
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={!status?.isConnected || batchTargets.length === 0 || batchText.trim().length === 0}
                  onClick={() => setIsBatchConfirmOpen(true)}
                >
                  <MessageCircleIcon className="size-4" />
                  Revisar e enviar lote
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio em lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Este lote sera enviado para {batchTargets.length} contato(s) deduplicado(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBatchSend()} disabled={isSendingBatch}>
              {isSendingBatch ? 'Enviando...' : 'Confirmar envio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
