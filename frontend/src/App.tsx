import { LockKeyholeIcon, LogOutIcon } from 'lucide-react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { AuthPage } from '@/pages/auth-page';
import { ContactsPage } from '@/pages/contacts-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { HistoryPage } from '@/pages/history-page';
import { ListsPage } from '@/pages/lists-page';
import { MessageTemplatesPage } from '@/pages/message-templates-page';
import { SendPage } from '@/pages/send-page';
import { SessionPage } from '@/pages/session-page';
import { UsersPage } from '@/pages/users-page';
import { AppDataProvider } from '@/providers/app-data-provider';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';

const routeTitles: Record<string, string> = {
  '/': 'Painel',
  '/session': 'Conexão do WhatsApp',
  '/contacts': 'Agenda',
  '/lists': 'Listas',
  '/users': 'Usuários',
  '/templates': 'Modelos e sequências',
  '/send': 'Envios',
  '/history': 'Histórico'
};

function AppBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl border-border/70 bg-card/95 shadow-xl">
        <CardContent className="flex flex-col gap-6 py-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/12 p-3 text-primary">
              <LockKeyholeIcon className="size-5" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-56" />
            </div>
          </div>

          <div className="grid gap-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-2/3 rounded-2xl" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProtectedAppLayout() {
  const location = useLocation();
  const { status } = useAppData();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  function handleLogout() {
    logout();
    toast.success('Sessão encerrada com sucesso.');
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarRail />
      <SidebarInset className="bg-transparent">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-420 items-center justify-between gap-4 px-4 py-3 lg:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="hidden h-5 sm:block" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {routeTitles[location.pathname] ?? 'Ponto Auto Msg'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Conecte, organize e acompanhe seus envios em um só lugar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden text-right md:block">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Conta ativa
                </p>
                <p className="text-sm font-medium text-foreground">{user?.email ?? 'Conta logada'}</p>
              </div>

              <Badge
                variant={status?.isConnected ? 'default' : 'secondary'}
                className="rounded-full px-3 py-1"
              >
                {status?.isConnected ? 'WhatsApp online' : 'Conexão pendente'}
              </Badge>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOutIcon className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-420 flex-1 flex-col px-4 py-6 lg:px-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/session" element={<SessionPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
            <Route
              path="/templates"
              element={isAdmin ? <MessageTemplatesPage /> : <Navigate to="/" replace />}
            />
            <Route path="/send" element={<SendPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ProtectedApp() {
  const location = useLocation();
  const { isAuthenticated, isBooting } = useAuth();

  if (isBooting) {
    return <AppBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppDataProvider>
      <ProtectedAppLayout />
    </AppDataProvider>
  );
}

function AuthOnlyRoute() {
  const { isAuthenticated, isBooting } = useAuth();

  if (isBooting) {
    return <AppBootScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthPage />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<AuthOnlyRoute />} />
        <Route path="*" element={<ProtectedApp />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
