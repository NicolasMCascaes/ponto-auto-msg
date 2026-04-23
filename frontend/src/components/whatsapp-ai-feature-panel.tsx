import {
  BotMessageSquareIcon,
  BrainCircuitIcon,
  CopyIcon,
  MessageCircleReplyIcon,
  RouteIcon,
  ShieldAlertIcon,
  SparklesIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AI_COMMAND_EXAMPLE = '/4.0 explique IoT de forma simples';

const automationFlow = [
  {
    title: 'Recebe o comando',
    description: 'Lê mensagens privadas 1:1 que chegam com o prefixo /4.0.',
    icon: BotMessageSquareIcon
  },
  {
    title: 'Valida o escopo',
    description: 'Mantém a conversa focada em Indústria 4.0 e redireciona fora do tema.',
    icon: BrainCircuitIcon
  },
  {
    title: 'Tenta responder',
    description: 'Usa modelo principal e cadeia de fallback configurados no backend.',
    icon: RouteIcon
  },
  {
    title: 'Retorna no mesmo chat',
    description: 'Entrega a resposta no próprio WhatsApp, com fallback amigável se necessário.',
    icon: MessageCircleReplyIcon
  }
] as const;

const commandExamples = [
  {
    label: 'Vai responder',
    example: '/4.0 o que é computação em nuvem industrial?',
    tone: 'default' as const
  },
  {
    label: 'Redireciona',
    example: '/4.0 qual a diferença do HTML pro PHP?',
    tone: 'secondary' as const
  },
  {
    label: 'Ignora',
    example: 'bom dia',
    tone: 'outline' as const
  }
] as const;

type WhatsappAiFeaturePanelProps = {
  isWhatsappConnected: boolean;
};

export function WhatsappAiFeaturePanel({
  isWhatsappConnected
}: WhatsappAiFeaturePanelProps) {
  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(AI_COMMAND_EXAMPLE);
      toast.success('Comando /4.0 copiado.');
    } catch {
      toast.error('Não foi possível copiar o comando agora.');
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="relative overflow-hidden border-border/70 bg-[linear-gradient(150deg,rgba(15,76,58,0.98),rgba(19,49,40,0.96)_45%,rgba(15,30,25,0.98))] text-primary-foreground shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,248,240,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(246,179,95,0.18),transparent_26%)]" />

        <CardHeader className="relative gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-white/15 bg-white/10 px-3 py-1 text-primary-foreground shadow-none">
              <SparklesIcon className="size-4" />
              IA no WhatsApp
            </Badge>
            <Badge
              variant={isWhatsappConnected ? 'default' : 'secondary'}
              className="rounded-full px-3 py-1"
            >
              {isWhatsappConnected ? 'Sessão pronta para responder' : 'Dependente da sessão do WhatsApp'}
            </Badge>
          </div>

          <div className="space-y-2">
            <CardTitle className="max-w-2xl text-2xl tracking-tight text-primary-foreground">
              O comando <span className="font-mono text-[0.95em]">/4.0</span> já tem um lugar claro no produto.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-primary-foreground/76">
              Esta automação fica acoplada à sua sessão do WhatsApp, lê o comando recebido,
              consulta a IA no backend e responde no mesmo contato sem misturar a lógica com os
              envios operacionais do painel.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative grid gap-4">
          <div className="rounded-[1.75rem] border border-white/12 bg-white/9 p-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/62">
                  Comando-base
                </p>
                <p className="mt-3 font-mono text-sm text-primary-foreground sm:text-base">
                  {AI_COMMAND_EXAMPLE}
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border-0 bg-white/14 text-primary-foreground hover:bg-white/18"
                onClick={() => void handleCopyCommand()}
              >
                <CopyIcon className="size-4" />
                Copiar exemplo
              </Button>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/74">
              O resto da mensagem vira pergunta para a IA. Se o tema sair de Indústria 4.0,
              o sistema não entra em modo “resposta livre”: ele recusa com educação e puxa a
              conversa de volta para o foco certo.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/12 bg-black/10 p-5 backdrop-blur-sm">
            <div className="ml-auto max-w-[85%] rounded-[1.5rem] rounded-br-md border border-white/10 bg-white/12 px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
              <p className="font-medium text-primary-foreground/72">Contato</p>
              <p className="mt-1 font-mono text-[13px] sm:text-sm">/4.0 o que é indústria 4.0?</p>
            </div>

            <div className="max-w-[88%] rounded-[1.5rem] rounded-bl-md bg-[#fff4e8] px-4 py-4 text-sm leading-6 text-[#214136] shadow-sm">
              <p className="font-medium text-[#2d5a4a]">Resposta automática</p>
              <p className="mt-1">
                Indústria 4.0 é a fase em que máquinas, dados e sistemas trabalham conectados
                para deixar a operação mais inteligente, previsível e eficiente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-white/12 px-3 py-1 text-primary-foreground"
              >
                Só chats privados 1:1
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-white/12 px-3 py-1 text-primary-foreground"
              >
                Tema validado antes de responder
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-white/12 px-3 py-1 text-primary-foreground"
              >
                Fallback amigável se a IA cair
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="gap-3">
          <CardDescription>Representação da feature</CardDescription>
          <CardTitle>Como a automação se comporta</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            {automationFlow.map((item) => (
              <div
                key={item.title}
                className="flex gap-3 rounded-2xl border border-border/70 bg-background/75 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                  <item.icon className="size-4.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-muted/30 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Leitura operacional do fluxo</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                A ativação final, o modelo principal e a cadeia de fallback continuam controlados
                no backend. O painel aqui mostra a lógica da feature e a dependência direta da
                sessão atual do WhatsApp.
              </p>
            </div>

            <div className="grid gap-2">
              {commandExamples.map((item) => (
                <div
                  key={item.example}
                  className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[13px] text-foreground sm:text-sm">{item.example}</p>
                    <Badge variant={item.tone} className="rounded-full px-3 py-1">
                      {item.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
