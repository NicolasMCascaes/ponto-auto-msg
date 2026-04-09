export type MessageTemplateGroup = 'teacher' | 'staff';

export const MESSAGE_TEMPLATE_CONTENT_MAX_LENGTH = 500;

const teacherNotesPattern = /^prof/i;

export function isMessageTemplateGroup(value: unknown): value is MessageTemplateGroup {
  return value === 'teacher' || value === 'staff';
}

export function getMessageTemplateGroupFromNotes(notes?: string | null): MessageTemplateGroup {
  const normalizedNotes = notes?.trim() ?? '';
  return teacherNotesPattern.test(normalizedNotes) ? 'teacher' : 'staff';
}

export function getMessageTemplateGroupLabel(group: MessageTemplateGroup): string {
  return group === 'teacher' ? 'professores' : 'funcionarios comuns';
}

export function renderMessageTemplateContent(content: string, contactName: string): string {
  return content.replace(/\{nome\}/g, contactName.trim());
}
