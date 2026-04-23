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

export type MessageTemplateGroup = 'teacher' | 'staff';

export type MessageTemplate = {
  id: number;
  group: MessageTemplateGroup;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageSequenceStep = {
  id: number;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type MessageSequence = {
  id: number;
  title: string;
  cooldownMs: number;
  steps: MessageSequenceStep[];
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
  sendMode: 'manual' | 'contact' | 'batch' | 'sequence';
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

export type MessageTemplateInput = {
  group: MessageTemplateGroup;
  title: string;
  content: string;
};

export type MessageSequenceInput = {
  title: string;
  cooldownMs: number;
  steps: Array<{
    content: string;
  }>;
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

export type SendBatchInput =
  | {
      mode: 'manual';
      text: string;
      contactIds: number[];
      listIds: number[];
    }
  | {
      mode: 'group-random';
      contactIds: number[];
      listIds: number[];
      text?: never;
    }
  | {
      mode: 'sequence';
      sequenceId: number;
      contactIds: number[];
      listIds: number[];
      text?: never;
    };

export type SendBatchResult = {
  batchId: number;
  totalTargets: number;
  successCount: number;
  failedCount: number;
  mode: SendBatchInput['mode'];
  totalSteps: number;
  totalMessagesPlanned: number;
  haltedContacts: number;
};

export type AuthUser = {
  id: number;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
};

export type AuthCredentials = {
  email: string;
  password: string;
};

export type CreateUserInput = AuthCredentials;

export type AuthSession = {
  token: string;
  user: AuthUser;
};

type ApiEnvelope<T> = {
  data: T;
  message?: string;
  status?: ConnectionStatus;
};

type ApiUnauthorizedHandler = () => void;

const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredApiBase && configuredApiBase.length > 0 ? configuredApiBase : '/api').replace(
  /\/$/,
  ''
);
const USE_NGROK_BYPASS_HEADER = /ngrok-free\.(app|dev)/.test(API_BASE);
let apiAuthToken: string | null = null;
let unauthorizedHandler: ApiUnauthorizedHandler | null = null;

export function setApiAuthToken(token: string | null) {
  apiAuthToken = token?.trim() || null;
}

export function setApiUnauthorizedHandler(handler: ApiUnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function buildApiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function withDefaultHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);

  if (USE_NGROK_BYPASS_HEADER) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  if (apiAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${apiAuthToken}`);
  }

  return {
    ...init,
    headers
  };
}

function parseApiPayload(raw: string): { error?: { message?: string } } {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { error?: { message?: string } };
  } catch {
    throw new Error(
      'A resposta da API veio em formato inválido. Verifique a VITE_API_BASE_URL e o deploy do backend.'
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
  const response = await fetch(buildApiUrl(path), withDefaultHeaders(init));
  const raw = await response.text();
  const payload = parseApiPayload(raw);

  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== '/auth/login' &&
      unauthorizedHandler
    ) {
      unauthorizedHandler();
    }

    throw new Error(payload.error?.message ?? 'Falha na requisição.');
  }

  return payload as T;
}

export const api = {
  login(input: AuthCredentials) {
    return requestJson<ApiEnvelope<AuthSession>>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  getCurrentUser() {
    return requestJson<ApiEnvelope<{ user: AuthUser }>>('/auth/me');
  },
  createUser(input: CreateUserInput) {
    return requestJson<ApiEnvelope<{ user: AuthUser }>>('/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
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
    const response = await fetch(
      buildApiUrl(`/contacts/${id}`),
      withDefaultHeaders({
        method: 'DELETE'
      })
    );

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);

      if (response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }

      throw new Error(payload.error?.message ?? 'Falha ao excluir contato.');
    }
  },
  getContactLists() {
    return requestJson<ApiEnvelope<ContactListSummary[]>>('/contact-lists');
  },
  getMessageTemplates() {
    return requestJson<ApiEnvelope<MessageTemplate[]>>('/message-templates');
  },
  createMessageTemplate(input: MessageTemplateInput) {
    return requestJson<ApiEnvelope<MessageTemplate>>('/message-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  updateMessageTemplate(id: number, input: MessageTemplateInput) {
    return requestJson<ApiEnvelope<MessageTemplate>>(`/message-templates/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  async deleteMessageTemplate(id: number) {
    const response = await fetch(
      buildApiUrl(`/message-templates/${id}`),
      withDefaultHeaders({
        method: 'DELETE'
      })
    );

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);

      if (response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }

      throw new Error(payload.error?.message ?? 'Falha ao excluir modelo de mensagem.');
    }
  },
  getMessageSequences() {
    return requestJson<ApiEnvelope<MessageSequence[]>>('/message-sequences');
  },
  createMessageSequence(input: MessageSequenceInput) {
    return requestJson<ApiEnvelope<MessageSequence>>('/message-sequences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  updateMessageSequence(id: number, input: MessageSequenceInput) {
    return requestJson<ApiEnvelope<MessageSequence>>(`/message-sequences/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });
  },
  async deleteMessageSequence(id: number) {
    const response = await fetch(
      buildApiUrl(`/message-sequences/${id}`),
      withDefaultHeaders({
        method: 'DELETE'
      })
    );

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);

      if (response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }

      throw new Error(payload.error?.message ?? 'Falha ao excluir sequencia de mensagens.');
    }
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
    const response = await fetch(
      buildApiUrl(`/contact-lists/${id}`),
      withDefaultHeaders({
        method: 'DELETE'
      })
    );

    if (!response.ok) {
      const raw = await response.text();
      const payload = parseApiPayload(raw);

      if (response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }

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
