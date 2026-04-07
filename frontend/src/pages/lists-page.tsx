import { useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppData } from '@/providers/app-data-provider';

type ListDraft = {
  name: string;
  description: string;
};

function createEmptyDraft(): ListDraft {
  return {
    name: '',
    description: ''
  };
}

export function ListsPage() {
  const { lists, contacts, createList, updateList, deleteList } = useAppData();
  const [draft, setDraft] = useState<ListDraft>(createEmptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const mappedMembers = useMemo(() => {
    const counts = new Map<number, number>();

    for (const contact of contacts) {
      for (const listId of contact.listIds) {
        counts.set(listId, (counts.get(listId) ?? 0) + 1);
      }
    }

    return counts;
  }, [contacts]);

  function openCreateDialog() {
    setEditingId(null);
    setDraft(createEmptyDraft());
    setIsDialogOpen(true);
  }

  function openEditDialog(listId: number) {
    const list = lists.find((item) => item.id === listId);

    if (!list) {
      return;
    }

    setEditingId(listId);
    setDraft({
      name: list.name,
      description: list.description ?? ''
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const payload = {
        name: draft.name,
        description: draft.description
      };

      if (editingId) {
        await updateList(editingId, payload);
        toast.success('Lista atualizada com sucesso.');
      } else {
        await createList(payload);
        toast.success('Lista criada com sucesso.');
      }

      setDraft(createEmptyDraft());
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar lista.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) {
      return;
    }

    try {
      await deleteList(deletingId);
      toast.success('Lista removida com sucesso.');
      setDeletingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover lista.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Listas"
        title="Agrupe numeros por contexto"
        description="Monte listas operacionais para reaproveitar os mesmos destinatarios em lotes futuros sem duplicar cadastros."
        actions={
          <Button onClick={openCreateDialog}>
            <PlusIcon className="size-4" />
            Nova lista
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {lists.length === 0 ? (
          <Card className="col-span-full border-dashed border-border/70 bg-card/90">
            <CardContent className="flex min-h-[16rem] flex-col items-center justify-center gap-2 text-center">
              <p className="text-lg font-semibold">Nenhuma lista criada ainda</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Crie listas para separar equipes, filiais, frentes ou qualquer agrupamento que voce use com frequencia.
              </p>
            </CardContent>
          </Card>
        ) : (
          lists.map((list) => (
            <Card key={list.id} className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{list.name}</CardTitle>
                    <CardDescription>{list.description ?? 'Sem descricao adicional.'}</CardDescription>
                  </div>
                  <Badge variant="secondary">{mappedMembers.get(list.id) ?? list.memberCount} membro(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  Atualizada em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(list.updatedAt))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => openEditDialog(list.id)}>
                    <PencilIcon className="size-4" />
                    Editar
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setDeletingId(list.id)}>
                    <Trash2Icon className="size-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar lista' : 'Nova lista'}</DialogTitle>
            <DialogDescription>
              Defina um nome claro e uma descricao curta para facilitar a selecao nos lotes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="list-name">Nome</Label>
              <Input
                id="list-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex.: Filial Campinas"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="list-description">Descricao</Label>
              <Textarea
                id="list-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Contexto da lista e quando ela deve ser usada."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Criar lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingId)} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Os contatos continuam existindo na agenda, mas deixam de fazer parte desta lista.
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
