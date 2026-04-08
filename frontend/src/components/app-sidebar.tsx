import {
  BookUserIcon,
  BoxesIcon,
  Clock3Icon,
  HomeIcon,
  SendIcon,
  SmartphoneIcon
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { useAppData } from '@/providers/app-data-provider';

const navigationItems = [
  {
    title: 'Painel',
    href: '/',
    icon: HomeIcon
  },
  {
    title: 'WhatsApp',
    href: '/session',
    icon: SmartphoneIcon
  },
  {
    title: 'Contatos',
    href: '/contacts',
    icon: BookUserIcon
  },
  {
    title: 'Listas',
    href: '/lists',
    icon: BoxesIcon
  },
  {
    title: 'Envios',
    href: '/send',
    icon: SendIcon
  },
  {
    title: 'Histórico',
    href: '/history',
    icon: Clock3Icon
  }
] as const;

function getStatusLabel(
  state: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | undefined
) {
  switch (state) {
    case 'connected':
      return 'Online';
    case 'connecting':
      return 'Conectando';
    case 'disconnected':
      return 'Offline';
    case 'error':
      return 'Atenção';
    case 'idle':
    default:
      return 'Pronto';
  }
}

export function AppSidebar() {
  const location = useLocation();
  const { contacts, lists, recentMessages, status } = useAppData();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-primary px-3 py-4 text-sidebar-primary-foreground shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sidebar-primary-foreground/80">
            Ponto Auto Msg
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-lg font-semibold">Central de mensagens</p>
            <p className="text-sm text-sidebar-primary-foreground/80">
              WhatsApp, contatos, listas e histórico em uma experiência única.
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={
                      item.href === '/'
                        ? location.pathname === '/'
                        : location.pathname.startsWith(item.href)
                    }
                  >
                    <NavLink end={item.href === '/'} to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.href === '/contacts' ? (
                    <SidebarMenuBadge>{contacts.length}</SidebarMenuBadge>
                  ) : null}
                  {item.href === '/lists' ? <SidebarMenuBadge>{lists.length}</SidebarMenuBadge> : null}
                  {item.href === '/history' ? (
                    <SidebarMenuBadge>{recentMessages.length}</SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/70 p-3 text-sidebar-foreground">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status da sessão</p>
              <p className="text-xs text-sidebar-foreground/70">
                {status?.lastUpdatedAt
                  ? new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    }).format(new Date(status.lastUpdatedAt))
                  : 'Sem leitura recente'}
              </p>
            </div>
            <Badge
              variant={status?.isConnected ? 'default' : 'secondary'}
              className="rounded-full px-2 py-0.5"
            >
              {getStatusLabel(status?.state)}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
