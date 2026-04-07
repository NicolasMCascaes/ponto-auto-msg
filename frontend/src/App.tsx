import { Route, Routes, useLocation } from 'react-router-dom';
import { AppSidebar } from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { DashboardPage } from '@/pages/dashboard-page';
import { HistoryPage } from '@/pages/history-page';
import { ContactsPage } from '@/pages/contacts-page';
import { ListsPage } from '@/pages/lists-page';
import { SendPage } from '@/pages/send-page';
import { SessionPage } from '@/pages/session-page';
import { useAppData } from '@/providers/app-data-provider';

const routeTitles: Record<string, string> = {
  '/': 'Painel principal',
  '/session': 'Controle da sessao',
  '/contacts': 'Agenda de contatos',
  '/lists': 'Listas e agrupamentos',
  '/send': 'Central de envio',
  '/history': 'Historico'
};

function AppLayout() {
  const location = useLocation();
  const { status } = useAppData();

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset className="bg-transparent">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="hidden h-5 sm:block" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {routeTitles[location.pathname] ?? 'Ponto Auto Msg'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fluxo unificado com shadcn, agenda e historico persistido.
                </p>
              </div>
            </div>

            <Badge variant={status?.isConnected ? 'default' : 'secondary'} className="rounded-full px-3 py-1">
              {status?.isConnected ? 'WhatsApp conectado' : 'Sessao pendente'}
            </Badge>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 py-6 lg:px-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}

export default function App() {
  return <AppLayout />;
}
