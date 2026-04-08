import type { ConnectionStatus } from '@/lib/api';

export function formatDateTime(value?: string) {
  if (!value) {
    return 'Sem atualização';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function normalizeNumberPreview(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : 'Sem destino';
}

export function getConnectionBadgeVariant(
  status?: ConnectionStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status?.state) {
    case 'connected':
      return 'default';
    case 'error':
    case 'disconnected':
      return 'destructive';
    case 'connecting':
      return 'secondary';
    case 'idle':
    default:
      return 'outline';
  }
}

export function getConnectionLabel(status?: ConnectionStatus) {
  switch (status?.state) {
    case 'connected':
      return 'WhatsApp pronto';
    case 'connecting':
      return status.reconnectScheduled ? 'Reconectando' : 'Aguardando QR Code';
    case 'disconnected':
      return 'Desconectado';
    case 'error':
      return 'Verifique a sessão';
    case 'idle':
    default:
      return 'Pronto para conectar';
  }
}
