import {
  startTransition,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  api,
  type ConnectionStatus,
  type Contact,
  type ContactFilters,
  type ContactInput,
  type ContactListInput,
  type ContactListSummary,
  type MessageTemplate,
  type MessageTemplateInput,
  type MessageFilters,
  type MessageLog,
  type SendBatchInput,
  type SendBatchResult,
  type SendSingleInput
} from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

type AppDataContextValue = {
  status: ConnectionStatus | null;
  contacts: Contact[];
  lists: ContactListSummary[];
  messageTemplates: MessageTemplate[];
  recentMessages: MessageLog[];
  isBooting: boolean;
  refreshCoreData: (options?: { silent?: boolean }) => Promise<void>;
  refreshStatus: (options?: { silent?: boolean }) => Promise<void>;
  refreshContacts: (filters?: ContactFilters) => Promise<Contact[]>;
  refreshLists: () => Promise<ContactListSummary[]>;
  refreshMessageTemplates: () => Promise<MessageTemplate[]>;
  refreshRecentMessages: (limit?: number) => Promise<MessageLog[]>;
  loadMessages: (filters?: MessageFilters) => Promise<MessageLog[]>;
  connectWhatsapp: () => Promise<{ message?: string; status?: ConnectionStatus }>;
  resetWhatsapp: () => Promise<{ message?: string; status?: ConnectionStatus }>;
  createContact: (input: ContactInput) => Promise<Contact>;
  updateContact: (id: number, input: ContactInput) => Promise<Contact>;
  deleteContact: (id: number) => Promise<void>;
  createList: (input: ContactListInput) => Promise<ContactListSummary>;
  updateList: (id: number, input: ContactListInput) => Promise<ContactListSummary>;
  deleteList: (id: number) => Promise<void>;
  createMessageTemplate: (input: MessageTemplateInput) => Promise<MessageTemplate>;
  updateMessageTemplate: (id: number, input: MessageTemplateInput) => Promise<MessageTemplate>;
  deleteMessageTemplate: (id: number) => Promise<void>;
  sendSingle: (input: SendSingleInput) => Promise<{ message?: string }>;
  sendBatch: (input: SendBatchInput) => Promise<{ message?: string; data: SendBatchResult }>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

const RECENT_MESSAGES_LIMIT = 8;
const STATUS_POLL_INTERVAL_MS = 3_000;
const RECENT_MESSAGES_POLL_INTERVAL_MS = 15_000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [lists, setLists] = useState<ContactListSummary[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [recentMessages, setRecentMessages] = useState<MessageLog[]>([]);
  const [isBooting, setIsBooting] = useState(true);

  const refreshStatus = useCallback(async () => {
    const nextStatus = await api.getWhatsappStatus();
    startTransition(() => {
      setStatus(nextStatus);
    });
  }, []);

  const refreshContacts = useCallback(async (filters?: ContactFilters) => {
    const payload = await api.getContacts(filters);
    const nextContacts = payload.data ?? [];

    if (!filters || Object.keys(filters).length === 0) {
      startTransition(() => {
        setContacts(nextContacts);
      });
    }

    return nextContacts;
  }, []);

  const refreshLists = useCallback(async () => {
    const payload = await api.getContactLists();
    const nextLists = payload.data ?? [];

    startTransition(() => {
      setLists(nextLists);
    });

    return nextLists;
  }, []);

  const refreshMessageTemplates = useCallback(async () => {
    if (user?.role !== 'admin') {
      startTransition(() => {
        setMessageTemplates([]);
      });
      return [];
    }

    const payload = await api.getMessageTemplates();
    const nextTemplates = payload.data ?? [];

    startTransition(() => {
      setMessageTemplates(nextTemplates);
    });

    return nextTemplates;
  }, [user?.role]);

  const refreshRecentMessages = useCallback(async (limit = RECENT_MESSAGES_LIMIT) => {
    const payload = await api.getRecentMessages(limit);
    const nextMessages = payload.data ?? [];

    if (limit === RECENT_MESSAGES_LIMIT) {
      startTransition(() => {
        setRecentMessages(nextMessages);
      });
    }

    return nextMessages;
  }, []);

  const loadMessages = useCallback(async (filters?: MessageFilters) => {
    const payload = await api.getMessages(filters);
    return payload.data ?? [];
  }, []);

  const refreshCoreData = useCallback(async () => {
    await Promise.all([
      refreshStatus(),
      refreshContacts(),
      refreshLists(),
      refreshMessageTemplates(),
      refreshRecentMessages()
    ]);
  }, [refreshContacts, refreshLists, refreshMessageTemplates, refreshRecentMessages, refreshStatus]);

  const connectWhatsapp = useCallback(async () => {
    const payload = await api.connectWhatsapp();

    if (payload.status) {
      startTransition(() => {
        setStatus(payload.status ?? null);
      });
    } else {
      await refreshStatus();
    }

    return payload;
  }, [refreshStatus]);

  const resetWhatsapp = useCallback(async () => {
    const payload = await api.resetWhatsapp();

    if (payload.status) {
      startTransition(() => {
        setStatus(payload.status ?? null);
      });
    } else {
      await refreshStatus();
    }

    return payload;
  }, [refreshStatus]);

  const createContact = useCallback(
    async (input: ContactInput) => {
      const payload = await api.createContact(input);
      await Promise.all([refreshContacts(), refreshLists()]);
      return payload.data;
    },
    [refreshContacts, refreshLists]
  );

  const updateContact = useCallback(
    async (id: number, input: ContactInput) => {
      const payload = await api.updateContact(id, input);
      await Promise.all([refreshContacts(), refreshLists()]);
      return payload.data;
    },
    [refreshContacts, refreshLists]
  );

  const deleteContact = useCallback(
    async (id: number) => {
      await api.deleteContact(id);
      await Promise.all([refreshContacts(), refreshLists(), refreshRecentMessages()]);
    },
    [refreshContacts, refreshLists, refreshRecentMessages]
  );

  const createList = useCallback(
    async (input: ContactListInput) => {
      const payload = await api.createContactList(input);
      await Promise.all([refreshLists(), refreshContacts()]);
      return payload.data;
    },
    [refreshContacts, refreshLists]
  );

  const updateList = useCallback(
    async (id: number, input: ContactListInput) => {
      const payload = await api.updateContactList(id, input);
      await Promise.all([refreshLists(), refreshContacts()]);
      return payload.data;
    },
    [refreshContacts, refreshLists]
  );

  const deleteList = useCallback(
    async (id: number) => {
      await api.deleteContactList(id);
      await Promise.all([refreshLists(), refreshContacts(), refreshRecentMessages()]);
    },
    [refreshContacts, refreshLists, refreshRecentMessages]
  );

  const createMessageTemplate = useCallback(
    async (input: MessageTemplateInput) => {
      const payload = await api.createMessageTemplate(input);
      await refreshMessageTemplates();
      return payload.data;
    },
    [refreshMessageTemplates]
  );

  const updateMessageTemplate = useCallback(
    async (id: number, input: MessageTemplateInput) => {
      const payload = await api.updateMessageTemplate(id, input);
      await refreshMessageTemplates();
      return payload.data;
    },
    [refreshMessageTemplates]
  );

  const deleteMessageTemplate = useCallback(
    async (id: number) => {
      await api.deleteMessageTemplate(id);
      await refreshMessageTemplates();
    },
    [refreshMessageTemplates]
  );

  const sendSingle = useCallback(
    async (input: SendSingleInput) => {
      const payload = await api.sendMessage(input);
      await refreshRecentMessages();
      return {
        message: payload.message
      };
    },
    [refreshRecentMessages]
  );

  const sendBatch = useCallback(
    async (input: SendBatchInput) => {
      const payload = await api.sendBatch(input);
      await refreshRecentMessages();
      return {
        message: payload.message,
        data: payload.data
      };
    },
    [refreshRecentMessages]
  );

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        await refreshCoreData();
      } catch {
        // Session invalidation is handled globally by the auth provider.
      }

      if (isMounted) {
        setIsBooting(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [refreshCoreData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshStatus().catch(() => {
        // Session invalidation is handled globally by the auth provider.
      });
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshStatus]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshRecentMessages().catch(() => {
        // Session invalidation is handled globally by the auth provider.
      });
    }, RECENT_MESSAGES_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshRecentMessages]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      status,
      contacts,
      lists,
      messageTemplates,
      recentMessages,
      isBooting,
      refreshCoreData,
      refreshStatus,
      refreshContacts,
      refreshLists,
      refreshMessageTemplates,
      refreshRecentMessages,
      loadMessages,
      connectWhatsapp,
      resetWhatsapp,
      createContact,
      updateContact,
      deleteContact,
      createList,
      updateList,
      deleteList,
      createMessageTemplate,
      updateMessageTemplate,
      deleteMessageTemplate,
      sendSingle,
      sendBatch
    }),
    [
      connectWhatsapp,
      contacts,
      createContact,
      createList,
      createMessageTemplate,
      deleteContact,
      deleteList,
      deleteMessageTemplate,
      isBooting,
      lists,
      loadMessages,
      messageTemplates,
      recentMessages,
      refreshContacts,
      refreshCoreData,
      refreshLists,
      refreshMessageTemplates,
      refreshRecentMessages,
      refreshStatus,
      resetWhatsapp,
      sendBatch,
      sendSingle,
      status,
      updateContact,
      updateList,
      updateMessageTemplate
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider.');
  }

  return context;
}
