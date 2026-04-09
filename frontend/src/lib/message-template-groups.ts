import type { MessageTemplateGroup } from '@/lib/api';

export const MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH = 500;

const teacherNotesPattern = /^prof/i;

export const MESSAGE_TEMPLATE_GROUP_OPTIONS: Array<{
  value: MessageTemplateGroup;
  label: string;
  memberLabel: string;
  description: string;
}> = [
  {
    value: 'teacher',
    label: 'Professores',
    memberLabel: 'Professor',
    description: 'Usado para contatos cuja observação começa com "prof".'
  },
  {
    value: 'staff',
    label: 'Funcionários comuns',
    memberLabel: 'Funcionário comum',
    description: 'Usado para todos os contatos que não entram como professor.'
  }
];

export function getContactGroupFromNotes(notes?: string): MessageTemplateGroup {
  const normalizedNotes = notes?.trim() ?? '';
  return teacherNotesPattern.test(normalizedNotes) ? 'teacher' : 'staff';
}

export function getMessageTemplateGroupLabel(group: MessageTemplateGroup): string {
  return MESSAGE_TEMPLATE_GROUP_OPTIONS.find((option) => option.value === group)?.label ?? group;
}

export function getMessageTemplateMemberLabel(group: MessageTemplateGroup): string {
  return (
    MESSAGE_TEMPLATE_GROUP_OPTIONS.find((option) => option.value === group)?.memberLabel ?? group
  );
}
