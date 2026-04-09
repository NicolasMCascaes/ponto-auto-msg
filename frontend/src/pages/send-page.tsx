import { useMemo, useState } from 'react';
import { AlertTriangleIcon, MessageCircleIcon, SendHorizonalIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
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
import { normalizeNumberPreview } from '@/lib/formatters';
import {
  getContactGroupFromNotes,
  getMessageTemplateGroupLabel
} from '@/lib/message-template-groups';
import { useAppData } from '@/providers/app-data-provider';

export function SendPage() {
  const { contacts, lists, messageTemplates, status, sendBatch, sendSingle } = useAppData();
  const [singleMode, setSingleMode] = useState<'contact' | 'manual'>('contact');
  const [singleContactId, setSingleContactId] = useState<string>('none');
  const [manualNumber, setManualNumber] = useState('');
  const [singleText, setSingleText] = useState('');
  const [batchMode, setBatchMode] = useState<'manual' | 'group-random'>('manual');
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

  const templateCounts = useMemo(() => {
    return {
      teacher: messageTemplates.filter((template) => template.group === 'teacher').length,
      staff: messageTemplates.filter((template) => template.group === 'staff').length
    };
  }, [messageTemplates]);

  const batchGroupCounts = useMemo(() => {
    return batchTargets.reduce(
      (totals, contact) => {
        const group = getContactGroupFromNotes(contact.notes);
        totals[group] += 1;
        return totals;
      },
      { teacher: 0, staff: 0 }
    );
  }, [batchTargets]);

  const missingTemplateGroups = useMemo(() => {
    const missing: Array<'teacher' | 'staff'> = [];

    if (batchGroupCounts.teacher > 0 && templateCounts.teacher === 0) {
      missing.push('teacher');
    }

    if (batchGroupCounts.staff > 0 && templateCounts.staff === 0) {
      missing.push('staff');
    }

    return missing;
  }, [batchGroupCounts, templateCounts]);

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
        toast.success(payload.message ?? 'Mensagem enviada.');
      } else {
        const payload = await sendSingle({
          number: manualNumber,
          text: singleText
        });
        toast.success(payload.message ?? 'Mensagem enviada.');
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
      const payload =
        batchMode === 'manual'
          ? await sendBatch({
              mode: 'manual',
              text: batchText,
              contactIds: selectedContactIds,
              listIds: selectedListIds
            })
          : await sendBatch({
              mode: 'group-random',
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
      setBatchMode('manual');
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
        title="Envie mensagens com confiança"
        description="Escolha um contato da agenda, informe um número avulso ou monte um envio em lote manual ou por grupo em poucos passos."
      />

      {!status?.isConnected ? (
        <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">WhatsApp ainda nao esta conectado</p>
              <p className="mt-1 text-destructive/80">
                Conecte sua sessão antes de iniciar novos envios.
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
                  <Label>Como você quer enviar?</Label>
                  <Select value={singleMode} onValueChange={(value) => setSingleMode(value as typeof singleMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">Contato salvo</SelectItem>
                      <SelectItem value="manual">Número avulso</SelectItem>
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
                            {contact.name} - {contact.number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="manual-number">Número avulso</Label>
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
                    ? 'Use um contato já salvo para manter seu histórico organizado e reutilizar dados com facilidade.'
                    : 'O envio avulso é ideal para mensagens rápidas. Se quiser reutilizar esse número depois, salve-o na agenda.'}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader>
                <CardDescription>Mensagem</CardDescription>
                <CardTitle>Escreva sua mensagem</CardTitle>
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
                <CardDescription>Destinatários</CardDescription>
                <CardTitle>Monte seu lote</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contatos disponíveis</Label>
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
                              {list.description ? ` - ${list.description}` : ''}
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
                <CardTitle>Revise antes de enviar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Modo do lote</Label>
                  <Select value={batchMode} onValueChange={(value) => setBatchMode(value as typeof batchMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="group-random">Por grupo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                {batchMode === 'manual' ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Professores</p>
                        <p className="mt-2 text-xl font-semibold">{batchGroupCounts.teacher}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {templateCounts.teacher} modelo(s) disponível(is)
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Funcionários</p>
                        <p className="mt-2 text-xl font-semibold">{batchGroupCounts.staff}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {templateCounts.staff} modelo(s) disponível(is)
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <UsersIcon className="size-4 text-primary" />
                        Sorteio por contato
                      </div>
                      <p className="mt-2">
                        Cada destinatário recebe uma mensagem aleatória do próprio grupo. A variável {'{nome}'} é preenchida automaticamente.
                      </p>
                    </div>

                    {missingTemplateGroups.length > 0 ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                        Faltam modelos cadastrados para{' '}
                        {missingTemplateGroups
                          .map((group) => getMessageTemplateGroupLabel(group))
                          .join(' e ')}
                        . Cadastre os modelos antes de enviar este lote.
                      </div>
                    ) : null}
                  </>
                )}

                <Button
                  className="w-full"
                  disabled={
                    !status?.isConnected ||
                    batchTargets.length === 0 ||
                    (batchMode === 'manual'
                      ? batchText.trim().length === 0
                      : missingTemplateGroups.length > 0)
                  }
                  onClick={() => setIsBatchConfirmOpen(true)}
                >
                  <MessageCircleIcon className="size-4" />
                  Revisar envio
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
              {batchMode === 'manual'
                ? `Esta mensagem será enviada para ${batchTargets.length} contato(s) únicos.`
                : `Este lote será enviado para ${batchTargets.length} contato(s) únicos com sorteio individual por grupo.`}
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
