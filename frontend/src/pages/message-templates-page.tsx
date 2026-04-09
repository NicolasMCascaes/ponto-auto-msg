import { useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { MessageTemplate, MessageTemplateGroup } from '@/lib/api';
import {
  getMessageTemplateGroupLabel,
  MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH,
  MESSAGE_TEMPLATE_GROUP_OPTIONS
} from '@/lib/message-template-groups';
import { useAppData } from '@/providers/app-data-provider';

type MessageTemplateDraft = {
  group: MessageTemplateGroup;
  title: string;
  content: string;
};

function createEmptyDraft(group: MessageTemplateGroup = 'teacher'): MessageTemplateDraft {
  return {
    group,
    title: '',
    content: ''
  };
}

export function MessageTemplatesPage() {
  const {
    messageTemplates,
    createMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate
  } = useAppData();
  const [draft, setDraft] = useState<MessageTemplateDraft>(createEmptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);

  const templatesByGroup = useMemo(() => {
    return {
      teacher: messageTemplates.filter((template) => template.group === 'teacher'),
      staff: messageTemplates.filter((template) => template.group === 'staff')
    };
  }, [messageTemplates]);

  function openCreateDialog(group: MessageTemplateGroup) {
    setEditingId(null);
    setDraft(createEmptyDraft(group));
    setIsDialogOpen(true);
  }

  function openEditDialog(template: MessageTemplate) {
    setEditingId(template.id);
    setDraft({
      group: template.group,
      title: template.title,
      content: template.content
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const payload = {
        group: draft.group,
        title: draft.title,
        content: draft.content
      };

      if (editingId) {
        await updateMessageTemplate(editingId, payload);
        toast.success('Modelo atualizado com sucesso.');
      } else {
        await createMessageTemplate(payload);
        toast.success('Modelo criado com sucesso.');
      }

      setDraft(createEmptyDraft());
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar modelo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingTemplate) {
      return;
    }

    try {
      await deleteMessageTemplate(deletingTemplate.id);
      toast.success('Modelo removido com sucesso.');
      setDeletingTemplate(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover modelo.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Modelos"
        title="Cadastre mensagens por grupo"
        description='Crie variacoes para professores e funcionarios comuns. Nos envios por grupo, cada contato recebe um modelo aleatorio do proprio grupo com a variavel {nome}.'
      />

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardContent className="grid gap-3 p-5 text-sm text-muted-foreground md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-foreground">Regra de classificacao</p>
            <p className="mt-2">
              Contatos com observacao iniciando em "prof" entram no grupo de professores.
              Todos os demais entram como funcionarios comuns.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-foreground">Variavel disponivel</p>
            <p className="mt-2">
              Use {'{nome}'} no texto para inserir automaticamente o nome completo do contato na hora do envio.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {MESSAGE_TEMPLATE_GROUP_OPTIONS.map((groupOption) => {
          const templates = templatesByGroup[groupOption.value];

          return (
            <Card key={groupOption.value} className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>{groupOption.label}</CardTitle>
                  <CardDescription>{groupOption.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{templates.length} modelo(s)</Badge>
                  <Button size="sm" onClick={() => openCreateDialog(groupOption.value)}>
                    <PlusIcon className="size-4" />
                    Novo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {templates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
                    Nenhum modelo cadastrado para {groupOption.label.toLowerCase()}.
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{template.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado em{' '}
                            {new Intl.DateTimeFormat('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            }).format(new Date(template.updatedAt))}
                          </p>
                        </div>
                        <Badge variant="outline">{getMessageTemplateGroupLabel(template.group)}</Badge>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{template.content}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => openEditDialog(template)}>
                          <PencilIcon className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setDeletingTemplate(template)}
                        >
                          <Trash2Icon className="size-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
            <DialogDescription>
              Escolha o grupo, defina um nome interno facil de reconhecer e escreva a mensagem com {'{nome}'} quando quiser personalizacao.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Grupo</Label>
              <Select
                value={draft.group}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, group: value as MessageTemplateGroup }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TEMPLATE_GROUP_OPTIONS.map((groupOption) => (
                    <SelectItem key={groupOption.value} value={groupOption.value}>
                      {groupOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-title">Nome interno</Label>
              <Input
                id="template-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex.: Cobranca cordial 1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-content">Mensagem</Label>
              <Textarea
                id="template-content"
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Boa tarde {nome}! Seu espelho ponto precisa ser corrigido."
                maxLength={MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH}
                className="min-h-40"
              />
              <p className="text-xs text-muted-foreground">
                {draft.content.length}/{MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH} caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Criar modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingTemplate)} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O texto deixara de participar dos sorteios por grupo.
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
