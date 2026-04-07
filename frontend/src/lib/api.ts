export type ConnectionStatus = {
  state: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
  lastUpdatedAt: string;
  lastError?: string;
  lastDisconnectCode?: number;
  qr?: string;
  reconnectScheduled?: boolean;
};

export type ContactListSummary = {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: number;
  name: string;
  number: string;
  notes?: string;
  isActive: boolean;
  listIds: number[];
  lists: Array<{ id: number; name: string }>;
  createdAt: string;
  updatedAt: string;
};

export type MessageLog = {
  id: number;
  destinationNumber: string;
  content: string;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  contactId?: number;
  contactName?: string;
  batchId?: number;
  sendMode: 'manual' | 'contact' | 'batch';
  listIds: number[];
  listNames: string[];
};

export type MessageFilters = {
  limit?: number;
  status?: 'sent' | 'failed';
  contactId?: number;
  listId?: number;
  search?: string;
};

export type ContactFilters = {
  search?: string;
  status?: 'active' | 'inactive';
  listId?: number;
};

export type ContactInput = {
  name: string;
  number: string;
  notes?: string;
  isActive: boolean;
  listIds: number[];
};

export type ContactListInput = {
  name: string;
  description?: string;
};

export type SendSingleInput =
  | {
      text: string;
      number: string;
      contactId?: never;
    }
  | {
      text: string;
      number?: never;
      contactId: number;
    };

export type SendBatchInput = {
  text: string;
  contactIds: number[];
  listIds: number[];
};

export type SendBatchResult = {
  batchId: number;
  totalTargets: number;
  successCount: number;
  failedCount: number;
};

type ApiEnvelope<T> = {
  data: T;
  message?: string;
  status?: ConnectionStatus;
};

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : '/api').replace(
  /\/$/,
  ''
);

function buildApiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseApiPayload(raw: string): { error?: { message?: string } } {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { error?: { message?: string } };
  } catch {
    throw new Error(
      'A resposta da API veio em formato invalido. Verifique a VITE_API_BASE_URL e o deploy do backend.'
    );
  }
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);
  const raw = await response.text();
  const payload = parseApiPayload(raw);

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Falha na requisicao.');
  }

  return payload as T;
}

export const api = {
  getWhatsappStatus() {
    return requestJson<ConnectionStatus>('/whatsapp/status');
  },
  connectWhatsapp() {
    return requestJson<{ message?: string; status?: ConnectionStatus }>('/whatsapp/connect', {
      method: 'POST'
    });
  },
  resetWhatsapp() {
    return requestJson<{ message?: string; status?: ConnectionStatus }>('/whatsapp/reset', {
      method: 'POST'
    });
  },
  getContacts(filters: ContactFilters = {}) {
    return requestJson<ApiEnvelope<Contact[]>>(
      `/contacts${buildQueryString({
        search: filters.search,
        status: filters.status,
        listId: filters.listId
      })}`
    );
  },
  createContact(input: ContactInput) {
    return requestJson<ApiEnvelope<Contact>>('/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  updateContact(id: number, input: ContactInput) {
    return requestJson<ApiEnvelope<Contact>>(`/contacts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  async deleteContact(id: number) {
    const response = await fetch(buildApiUrl(`/contacts/${id}`), {
      method: 'DELETE'
    });

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);
      throw new Error(payload.error?.message ?? 'Falha ao excluir contato.');
    }
  },
  getContactLists() {
    return requestJson<ApiEnvelope<ContactListSummary[]>>('/contact-lists');
  },
  createContactList(input: ContactListInput) {
    return requestJson<ApiEnvelope<ContactListSummary>>('/contact-lists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  updateContactList(id: number, input: ContactListInput) {
    return requestJson<ApiEnvelope<ContactListSummary>>(`/contact-lists/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  async deleteContactList(id: number) {
    const response = await fetch(buildApiUrl(`/contact-lists/${id}`), {
      method: 'DELETE'
    });

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);
      throw new Error(payload.error?.message ?? 'Falha ao excluir lista.');
    }
  },
  getRecentMessages(limit = 8) {
    return requestJson<ApiEnvelope<MessageLog[]>>(`/messages/recent?limit=${limit}`);
  },
  getMessages(filters: MessageFilters = {}) {
    return requestJson<ApiEnvelope<MessageLog[]>>(
      `/messages${buildQueryString({
        limit: filters.limit,
        status: filters.status,
        contactId: filters.contactId,
        listId: filters.listId,
        search: filters.search
      })}`
    );
  },
  sendMessage(input: SendSingleInput) {
    return requestJson<ApiEnvelope<{ messageId: string; jid: string; destinationNumber: string }>>(
      '/messages/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      }
    );
  },
  sendBatch(input: SendBatchInput) {
    return requestJson<ApiEnvelope<SendBatchResult>>('/messages/send-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  }
};
