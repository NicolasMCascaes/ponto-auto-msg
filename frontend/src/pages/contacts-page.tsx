import { useDeferredValue, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAppData } from '@/providers/app-data-provider';

type ContactDraft = {
  name: string;
  number: string;
  notes: string;
  isActive: boolean;
  listIds: number[];
};

function createEmptyDraft(): ContactDraft {
  return {
    name: '',
    number: '',
    notes: '',
    isActive: true,
    listIds: []
  };
}

export function ContactsPage() {
  const { contacts, lists, createContact, updateContact, deleteContact } = useAppData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [listFilter, setListFilter] = useState<'all' | string>('all');
  const [draft, setDraft] = useState<ContactDraft>(createEmptyDraft);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        deferredSearch.trim().length === 0 ||
        contact.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        contact.number.includes(deferredSearch) ||
        (contact.notes ?? '').toLowerCase().includes(deferredSearch.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && contact.isActive) ||
        (statusFilter === 'inactive' && !contact.isActive);
      const matchesList =
        listFilter === 'all' || contact.listIds.includes(Number.parseInt(listFilter, 10));

      return matchesSearch && matchesStatus && matchesList;
    });
  }, [contacts, deferredSearch, listFilter, statusFilter]);

  function openCreateSheet() {
    setEditingId(null);
    setDraft(createEmptyDraft());
    setIsSheetOpen(true);
  }

  function openEditSheet(contactId: number) {
    const contact = contacts.find((item) => item.id === contactId);

    if (!contact) {
      return;
    }

    setEditingId(contactId);
    setDraft({
      name: contact.name,
      number: contact.number,
      notes: contact.notes ?? '',
      isActive: contact.isActive,
      listIds: contact.listIds
    });
    setIsSheetOpen(true);
  }

  function toggleList(listId: number) {
    setDraft((current) => ({
      ...current,
      listIds: current.listIds.includes(listId)
        ? current.listIds.filter((item) => item !== listId)
        : [...current.listIds, listId]
    }));
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const payload = {
        name: draft.name,
        number: draft.number,
        notes: draft.notes,
        isActive: draft.isActive,
        listIds: draft.listIds
      };

      if (editingId) {
        await updateContact(editingId, payload);
        toast.success('Contato atualizado com sucesso.');
      } else {
        await createContact(payload);
        toast.success('Contato criado com sucesso.');
      }

      setIsSheetOpen(false);
      setDraft(createEmptyDraft());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar contato.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) {
      return;
    }

    try {
      await deleteContact(deletingId);
      toast.success('Contato removido com sucesso.');
      setDeletingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover contato.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contatos"
        title="Sua agenda de contatos"
        description="Cadastre contatos, adicione observações internas e organize tudo em listas reutilizáveis."
        actions={
          <Button onClick={openCreateSheet}>
            <PlusIcon className="size-4" />
            Novo contato
          </Button>
        }
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-lg">Contatos salvos</CardTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative min-w-[16rem]">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, número ou observação"
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Apenas ativos</SelectItem>
                <SelectItem value="inactive">Apenas inativos</SelectItem>
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
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Listas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Nenhum contato encontrado para os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {contact.notes || 'Sem observações internas.'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{contact.number}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contact.lists.length === 0 ? (
                            <Badge variant="outline">Sem listas</Badge>
                          ) : (
                            contact.lists.map((list) => (
                              <Badge key={list.id} variant="secondary">
                                {list.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={contact.isActive ? 'default' : 'secondary'}>
                          {contact.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditSheet(contact.id)}>
                            <PencilIcon className="size-4" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeletingId(contact.id)}>
                            <Trash2Icon className="size-4" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-5 pr-14">
            <SheetTitle>{editingId ? 'Editar contato' : 'Novo contato'}</SheetTitle>
            <SheetDescription>
              Cadastre uma vez e reutilize este contato sempre que precisar.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid gap-5 pb-2">
                <div className="grid gap-2">
                  <Label htmlFor="contact-name">Nome</Label>
                  <Input
                    id="contact-name"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Ex.: Operação São Paulo"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-number">Número</Label>
                  <Input
                    id="contact-number"
                    value={draft.number}
                    onChange={(event) => setDraft((current) => ({ ...current, number: event.target.value }))}
                    placeholder="5511999999999"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-notes">Observações</Label>
                  <Textarea
                    id="contact-notes"
                    value={draft.notes}
                    onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Informações internas sobre o contato."
                  />
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                  <Checkbox
                    id="contact-active"
                    checked={draft.isActive}
                    onCheckedChange={(value) =>
                      setDraft((current) => ({ ...current, isActive: Boolean(value) }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="contact-active">Contato ativo</Label>
                    <p className="text-xs text-muted-foreground">
                      Apenas contatos ativos aparecem nos envios por lista e em lote.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Listas vinculadas</Label>
                    <p className="text-xs text-muted-foreground">
                      Um contato pode pertencer a várias listas ao mesmo tempo.
                    </p>
                  </div>

                  <ScrollArea className="h-48 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-3">
                      {lists.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Crie listas primeiro para agrupar este contato.
                        </p>
                      ) : (
                        lists.map((list) => (
                          <label
                            key={list.id}
                            className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-3"
                          >
                            <Checkbox
                              checked={draft.listIds.includes(list.id)}
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
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <SheetFooter className="shrink-0 border-t border-border/60 bg-background px-6 py-4 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar contato'}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o contato da agenda e de todas as listas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
