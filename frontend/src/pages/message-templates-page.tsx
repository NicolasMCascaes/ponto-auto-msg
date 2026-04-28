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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type {
  MessageSequence,
  MessageSequenceInput,
  MessageTemplate,
  MessageTemplateGroup
} from '@/lib/api';
import { formatDateTime, formatDurationMs } from '@/lib/formatters';
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

type SequenceStepDraft = {
  id: string;
  content: string;
};

type SequenceCooldownUnit = 'seconds' | 'minutes';

type MessageSequenceDraft = {
  title: string;
  cooldownValue: string;
  cooldownUnit: SequenceCooldownUnit;
  steps: SequenceStepDraft[];
};

function createEmptyTemplateDraft(group: MessageTemplateGroup = 'teacher'): MessageTemplateDraft {
  return {
    group,
    title: '',
    content: ''
  };
}

function createStepDraft(content = ''): SequenceStepDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content
  };
}

function getCooldownDraft(cooldownMs: number): {
  cooldownValue: string;
  cooldownUnit: SequenceCooldownUnit;
} {
  if (cooldownMs > 0 && cooldownMs % 60_000 === 0) {
    return {
      cooldownValue: String(cooldownMs / 60_000),
      cooldownUnit: 'minutes'
    };
  }

  return {
    cooldownValue: String(Math.round(cooldownMs / 1_000)),
    cooldownUnit: 'seconds'
  };
}

function createEmptySequenceDraft(): MessageSequenceDraft {
  return {
    title: '',
    cooldownValue: '0',
    cooldownUnit: 'minutes',
    steps: [createStepDraft()]
  };
}

function createSequenceDraftFromSequence(sequence: MessageSequence): MessageSequenceDraft {
  const cooldown = getCooldownDraft(sequence.cooldownMs);

  return {
    title: sequence.title,
    cooldownValue: cooldown.cooldownValue,
    cooldownUnit: cooldown.cooldownUnit,
    steps: sequence.steps.map((step) => createStepDraft(step.content))
  };
}

function getCooldownMsFromDraft(draft: MessageSequenceDraft): number | null {
  const parsedValue = Number.parseInt(draft.cooldownValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return draft.cooldownUnit === 'minutes' ? parsedValue * 60_000 : parsedValue * 1_000;
}

function buildSequenceInput(draft: MessageSequenceDraft): MessageSequenceInput | null {
  const title = draft.title.trim();
  const cooldownMs = getCooldownMsFromDraft(draft);
  const steps = draft.steps
    .map((step) => ({
      content: step.content.trim()
    }))
    .filter((step) => step.content.length > 0);

  if (title.length === 0 || cooldownMs === null || steps.length === 0) {
    return null;
  }

  if (steps.some((step) => step.content.length > MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH)) {
    return null;
  }

  if (steps.length !== draft.steps.length) {
    return null;
  }

  return {
    title,
    cooldownMs,
    steps
  };
}

export function MessageTemplatesPage() {
  const {
    messageSequences,
    messageTemplates,
    createMessageSequence,
    createMessageTemplate,
    deleteMessageSequence,
    deleteMessageTemplate,
    updateMessageSequence,
    updateMessageTemplate
  } = useAppData();
  const [templateDraft, setTemplateDraft] = useState<MessageTemplateDraft>(createEmptyTemplateDraft);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);
  const [sequenceDraft, setSequenceDraft] = useState<MessageSequenceDraft>(createEmptySequenceDraft);
  const [editingSequenceId, setEditingSequenceId] = useState<number | null>(null);
  const [isSequenceDialogOpen, setIsSequenceDialogOpen] = useState(false);
  const [isSequenceSaving, setIsSequenceSaving] = useState(false);
  const [deletingSequence, setDeletingSequence] = useState<MessageSequence | null>(null);

  const templatesByGroup = useMemo(() => {
    return {
      teacher: messageTemplates.filter((template) => template.group === 'teacher'),
      staff: messageTemplates.filter((template) => template.group === 'staff')
    };
  }, [messageTemplates]);

  const sequenceInput = useMemo(() => buildSequenceInput(sequenceDraft), [sequenceDraft]);

  function openCreateTemplateDialog(group: MessageTemplateGroup) {
    setEditingTemplateId(null);
    setTemplateDraft(createEmptyTemplateDraft(group));
    setIsTemplateDialogOpen(true);
  }

  function openEditTemplateDialog(template: MessageTemplate) {
    setEditingTemplateId(template.id);
    setTemplateDraft({
      group: template.group,
      title: template.title,
      content: template.content
    });
    setIsTemplateDialogOpen(true);
  }

  function resetSequenceDialog() {
    setEditingSequenceId(null);
    setSequenceDraft(createEmptySequenceDraft());
  }

  function openCreateSequenceDialog() {
    resetSequenceDialog();
    setIsSequenceDialogOpen(true);
  }

  function openEditSequenceDialog(sequence: MessageSequence) {
    setEditingSequenceId(sequence.id);
    setSequenceDraft(createSequenceDraftFromSequence(sequence));
    setIsSequenceDialogOpen(true);
  }

  function updateSequenceStep(stepId: string, content: string) {
    setSequenceDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === stepId ? { ...step, content } : step))
    }));
  }

  function moveSequenceStep(stepId: string, direction: -1 | 1) {
    setSequenceDraft((current) => {
      const index = current.steps.findIndex((step) => step.id === stepId);

      if (index < 0) {
        return current;
      }

      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.steps.length) {
        return current;
      }

      const steps = [...current.steps];
      const [step] = steps.splice(index, 1);
      steps.splice(nextIndex, 0, step);

      return {
        ...current,
        steps
      };
    });
  }

  function removeSequenceStep(stepId: string) {
    setSequenceDraft((current) => {
      if (current.steps.length === 1) {
        return current;
      }

      return {
        ...current,
        steps: current.steps.filter((step) => step.id !== stepId)
      };
    });
  }

  function addSequenceStep() {
    setSequenceDraft((current) => ({
      ...current,
      steps: [...current.steps, createStepDraft()]
    }));
  }

  async function handleTemplateSave() {
    setIsTemplateSaving(true);

    try {
      const payload = {
        group: templateDraft.group,
        title: templateDraft.title,
        content: templateDraft.content
      };

      if (editingTemplateId) {
        await updateMessageTemplate(editingTemplateId, payload);
        toast.success('Modelo atualizado com sucesso.');
      } else {
        await createMessageTemplate(payload);
        toast.success('Modelo criado com sucesso.');
      }

      setTemplateDraft(createEmptyTemplateDraft());
      setIsTemplateDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar modelo.');
    } finally {
      setIsTemplateSaving(false);
    }
  }

  async function handleTemplateDelete() {
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

  async function handleSequenceSave() {
    if (!sequenceInput) {
      toast.error('Preencha o nome, o cooldown e todas as etapas da sequência.');
      return;
    }

    setIsSequenceSaving(true);

    try {
      if (editingSequenceId) {
        await updateMessageSequence(editingSequenceId, sequenceInput);
        toast.success('Sequência atualizada com sucesso.');
      } else {
        await createMessageSequence(sequenceInput);
        toast.success('Sequência criada com sucesso.');
      }

      resetSequenceDialog();
      setIsSequenceDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao salvar sequência.');
    } finally {
      setIsSequenceSaving(false);
    }
  }

  async function handleSequenceDelete() {
    if (!deletingSequence) {
      return;
    }

    try {
      await deleteMessageSequence(deletingSequence.id);
      toast.success('Sequência removida com sucesso.');
      setDeletingSequence(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover sequência.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Modelos"
        title="Cadastre modelos e sequências"
        description="Gerencie os modelos por grupo do espelho ponto e as novas sequências ordenadas com cooldown para envios em lote."
      />

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates">Por grupo</TabsTrigger>
          <TabsTrigger value="sequences">Sequências</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardContent className="grid gap-3 p-5 text-sm text-muted-foreground md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-medium text-foreground">Regra de classificação</p>
                <p className="mt-2">
                  Contatos com observação iniciando em "prof" entram no grupo de professores.
                  Todos os demais entram como funcionários comuns.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-medium text-foreground">Variável disponível</p>
                <p className="mt-2">
                  Use {'{nome}'} no texto para inserir automaticamente o nome completo do contato
                  na hora do envio.
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
                      <Button size="sm" onClick={() => openCreateTemplateDialog(groupOption.value)}>
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
                                Atualizado em {formatDateTime(template.updatedAt)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {getMessageTemplateGroupLabel(template.group)}
                            </Badge>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-foreground">
                            {template.content}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => openEditTemplateDialog(template)}
                            >
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
        </TabsContent>

        <TabsContent value="sequences" className="space-y-4">
          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardContent className="grid gap-3 p-5 text-sm text-muted-foreground md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-medium text-foreground">Fluxo da sequência</p>
                <p className="mt-2">
                  Cada etapa é enviada em ordem para todos os contatos elegíveis. O cooldown roda
                  entre o fim de uma etapa e o início da próxima.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="font-medium text-foreground">Personalização</p>
                <p className="mt-2">
                  A variável {'{nome}'} continua disponível em todas as etapas da sequência.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Sequências ordenadas</CardTitle>
                <CardDescription>
                  Crie sequências reutilizáveis para qualquer lista de contatos.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{messageSequences.length} sequência(s)</Badge>
                <Button size="sm" onClick={openCreateSequenceDialog}>
                  <PlusIcon className="size-4" />
                  Nova
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {messageSequences.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
                  Nenhuma sequência cadastrada ainda.
                </div>
              ) : (
                messageSequences.map((sequence) => (
                  <div
                    key={sequence.id}
                    className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{sequence.title}</p>
                          <Badge variant="outline">{sequence.steps.length} etapa(s)</Badge>
                          <Badge variant="secondary">
                            Cooldown: {formatDurationMs(sequence.cooldownMs)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Atualizado em {formatDateTime(sequence.updatedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openEditSequenceDialog(sequence)}>
                          <PencilIcon className="size-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDeletingSequence(sequence)}
                        >
                          <Trash2Icon className="size-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sequence.steps.map((step) => (
                        <div
                          key={step.id}
                          className="rounded-2xl border border-border/70 bg-card/70 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline">Etapa {step.position}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {step.content.length}/{MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH}
                            </span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                            {step.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
            <DialogDescription>
              Escolha o grupo, defina um nome interno fácil de reconhecer e escreva a mensagem com
              {' {nome} '}quando quiser personalização.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Grupo</Label>
              <Select
                value={templateDraft.group}
                onValueChange={(value) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    group: value as MessageTemplateGroup
                  }))
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
                value={templateDraft.title}
                onChange={(event) =>
                  setTemplateDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex.: Cobrança cordial 1"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="template-content">Mensagem</Label>
              <Textarea
                id="template-content"
                value={templateDraft.content}
                onChange={(event) =>
                  setTemplateDraft((current) => ({ ...current, content: event.target.value }))
                }
                placeholder="Boa tarde {nome}! Seu espelho ponto precisa ser corrigido."
                maxLength={MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH}
                className="min-h-40"
              />
              <p className="text-xs text-muted-foreground">
                {templateDraft.content.length}/{MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH} caracteres
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleTemplateSave()} disabled={isTemplateSaving}>
              {isTemplateSaving ? 'Salvando...' : editingTemplateId ? 'Salvar alterações' : 'Criar modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSequenceDialogOpen}
        onOpenChange={(open) => {
          setIsSequenceDialogOpen(open);

          if (!open) {
            resetSequenceDialog();
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b border-border/70 px-6 py-5 pr-14">
            <DialogTitle>{editingSequenceId ? 'Editar sequência' : 'Nova sequência'}</DialogTitle>
            <DialogDescription>
              Defina um nome, o cooldown entre etapas e a ordem das mensagens. Cada etapa pode usar
              a variável {'{nome}'}.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="sequence-title">Nome interno</Label>
                  <Input
                    id="sequence-title"
                    value={sequenceDraft.title}
                    onChange={(event) =>
                      setSequenceDraft((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    placeholder="Ex.: Apresentação indústria 4.0"
                    className="h-11 text-base"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                  <div className="hidden xl:block" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="sequence-cooldown-value">Cooldown</Label>
                      <Input
                        id="sequence-cooldown-value"
                        type="number"
                        min={0}
                        value={sequenceDraft.cooldownValue}
                        onChange={(event) =>
                          setSequenceDraft((current) => ({
                            ...current,
                            cooldownValue: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Unidade</Label>
                      <Select
                        value={sequenceDraft.cooldownUnit}
                        onValueChange={(value) =>
                          setSequenceDraft((current) => ({
                            ...current,
                            cooldownUnit: value as SequenceCooldownUnit
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">Segundos</SelectItem>
                          <SelectItem value="minutes">Minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Etapas</Label>
                    <p className="text-xs text-muted-foreground">
                      As mensagens serão enviadas exatamente nesta ordem.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSequenceStep}>
                    <PlusIcon className="size-4" />
                    Adicionar etapa
                  </Button>
                </div>

                <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                  {sequenceDraft.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Etapa {index + 1}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {step.content.length}/{MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveSequenceStep(step.id, -1)}
                            disabled={index === 0}
                          >
                            Subir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveSequenceStep(step.id, 1)}
                            disabled={index === sequenceDraft.steps.length - 1}
                          >
                            Descer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeSequenceStep(step.id)}
                            disabled={sequenceDraft.steps.length === 1}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>

                      <Textarea
                        value={step.content}
                        onChange={(event) => updateSequenceStep(step.id, event.target.value)}
                        maxLength={MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH}
                        className="min-h-32"
                        placeholder={`Escreva a etapa ${index + 1} da sequência.`}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  Cooldown atual: {formatDurationMs(sequenceInput?.cooldownMs ?? 0)}.
                </div>
              </div>
            </div>

          <DialogFooter className="shrink-0 border-t border-border/70 px-6 py-4">
            <Button variant="outline" onClick={() => setIsSequenceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSequenceSave()} disabled={isSequenceSaving}>
              {isSequenceSaving ? 'Salvando...' : editingSequenceId ? 'Salvar alterações' : 'Criar sequência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => !open && setDeletingTemplate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              O texto deixará de participar dos sorteios por grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleTemplateDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletingSequence)}
        onOpenChange={(open) => !open && setDeletingSequence(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sequência?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa sequência deixará de aparecer no envio em lote e todas as etapas serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSequenceDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
