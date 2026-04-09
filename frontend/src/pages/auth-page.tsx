import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRightIcon,
  KeyRoundIcon,
  MailIcon,
  MessageCircleMoreIcon,
  ShieldCheckIcon,
  SparklesIcon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/auth-provider';

type FormState = {
  email: string;
  password: string;
};

const initialFormState: FormState = {
  email: '',
  password: ''
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loginForm, setLoginForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const fromState = (location.state as { from?: string } | null)?.from;
    return typeof fromState === 'string' && fromState.length > 0 ? fromState : '/';
  }, [location.state]);

  function validateCredentials(email: string, password: string) {
    if (!isValidEmail(email.trim().toLowerCase())) {
      return 'Informe um e-mail válido.';
    }

    if (password.trim().length < 8) {
      return 'A senha precisa ter pelo menos 8 caracteres.';
    }

    return null;
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;
    const validationError = validateCredentials(email, password);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });
      toast.success('Acesso liberado com sucesso.');
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível entrar agora.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden px-8 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/12 via-accent/15 to-transparent" />
          <div className="absolute inset-x-8 bottom-10 h-56 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary/80">
                Ponto Auto Msg
              </p>
              <p className="mt-3 max-w-md text-4xl font-semibold tracking-tight text-foreground">
                Organize sua rotina de mensagens com mais clareza desde o primeiro acesso.
              </p>
            </div>

            <Badge className="rounded-full px-3 py-1">
              <SparklesIcon className="size-4" />
              Acesso da equipe
            </Badge>
          </div>

          <div className="relative grid gap-5">
            <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur-sm">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-xl">O que você encontra aqui</CardTitle>
                <CardDescription>
                  Seu painel já está pronto para conectar o WhatsApp, organizar contatos e
                  acompanhar cada envio com mais tranquilidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="rounded-2xl bg-primary/12 p-2 text-primary">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Tudo salvo no seu espaço</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Entre com sua conta e retome sua operação de onde parou, com agenda, listas e
                      histórico no mesmo lugar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="rounded-2xl bg-accent/60 p-2 text-accent-foreground">
                    <MessageCircleMoreIcon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Fluxo simples para o dia a dia</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Conecte o WhatsApp, monte seus públicos e envie mensagens com acompanhamento
                      claro.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">1</CardTitle>
                  <CardDescription>Entre com seu usuário em instantes.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">QR</CardTitle>
                  <CardDescription>Conexão do WhatsApp direto no painel.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">24h</CardTitle>
                  <CardDescription>Histórico e operação sempre à mão.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-xl">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
                  Ponto Auto Msg
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Entre para continuar
                </p>
              </div>

              <Badge variant="secondary" className="rounded-full px-3 py-1">
                Acesso
              </Badge>
            </div>

            <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur-sm">
              <CardHeader className="border-b border-border/60">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  Seu painel
                </Badge>
                <CardTitle className="text-3xl tracking-tight">Entre no seu painel</CardTitle>
                <CardDescription className="max-w-lg leading-6">
                  Use seu e-mail e senha para acessar sua rotina, conectar o WhatsApp e acompanhar
                  contatos, listas e envios com mais facilidade.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                <form className="flex flex-col gap-4" onSubmit={handleLoginSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="voce@empresa.com"
                        value={loginForm.email}
                        onChange={(event) =>
                          setLoginForm((current) => ({ ...current, email: event.target.value }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Sua senha"
                        value={loginForm.password}
                        onChange={(event) =>
                          setLoginForm((current) => ({
                            ...current,
                            password: event.target.value
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {errorMessage}
                    </p>
                  ) : null}

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Entrando...' : 'Entrar agora'}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </form>

                <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Cadastro interno</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Novos usuários só podem ser criados por um administrador autenticado.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Tudo pronto para começar</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Depois do acesso, você entra direto no painel para conectar seu número,
                    organizar contatos e acompanhar a operação.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
