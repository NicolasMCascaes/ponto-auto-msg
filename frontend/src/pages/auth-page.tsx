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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/providers/auth-provider';

type AuthTab = 'login' | 'register';

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

const initialFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: ''
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [loginForm, setLoginForm] = useState<FormState>(initialFormState);
  const [registerForm, setRegisterForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<AuthTab | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const fromState = (location.state as { from?: string } | null)?.from;
    return typeof fromState === 'string' && fromState.length > 0 ? fromState : '/';
  }, [location.state]);

  function handleTabChange(value: string) {
    setActiveTab(value as AuthTab);
    setErrorMessage(null);
  }

  function validateCredentials(email: string, password: string) {
    if (!isValidEmail(email.trim().toLowerCase())) {
      return 'Informe um e-mail valido.';
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

    setIsSubmitting('login');

    try {
      await login({ email, password });
      toast.success('Acesso liberado com sucesso.');
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel entrar agora.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(null);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const email = registerForm.email.trim().toLowerCase();
    const password = registerForm.password;
    const validationError = validateCredentials(email, password);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (registerForm.confirmPassword !== password) {
      setErrorMessage('A confirmacao de senha precisa ser igual a senha informada.');
      return;
    }

    setIsSubmitting('register');

    try {
      await register({ email, password });
      toast.success('Conta criada. Bem-vindo ao painel.');
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel criar sua conta.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(null);
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
                Centralize sua operacao de mensagens com mais controle desde o primeiro acesso.
              </p>
            </div>

            <Badge className="rounded-full px-3 py-1">
              <SparklesIcon className="size-4" />
              Workspace privado
            </Badge>
          </div>

          <div className="relative grid gap-5">
            <Card className="border-border/70 bg-card/85 shadow-xl backdrop-blur-sm">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="text-xl">Antes de entrar</CardTitle>
                <CardDescription>
                  Seu painel continua pronto para QR Code, agenda, listas e historico. Agora com
                  acesso autenticado para organizar tudo com mais seguranca.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="rounded-2xl bg-primary/12 p-2 text-primary">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Acesso protegido por token</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      O backend valida sua sessao com JWT e mantem as credenciais fora do navegador.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
                  <div className="rounded-2xl bg-accent/60 p-2 text-accent-foreground">
                    <MessageCircleMoreIcon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Fluxo pronto para operar</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Conecte o WhatsApp, cadastre destinos e acompanhe seus envios em um unico
                      lugar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">1</CardTitle>
                  <CardDescription>Cadastro ou login em poucos segundos.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">QR</CardTitle>
                  <CardDescription>Conexao do WhatsApp direto pelo painel.</CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-3xl">24h</CardTitle>
                  <CardDescription>Historico e operacao sempre a um clique.</CardDescription>
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
                Autenticacao
              </Badge>
            </div>

            <Card className="border-border/70 bg-card/95 shadow-2xl backdrop-blur-sm">
              <CardHeader className="border-b border-border/60">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  Acesso ao painel
                </Badge>
                <CardTitle className="text-3xl tracking-tight">Login e registro</CardTitle>
                <CardDescription className="max-w-lg leading-6">
                  Use seu e-mail e senha para entrar no workspace, conectar sua sessao e gerenciar
                  contatos, listas e envios com mais tranquilidade.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="register">Criar conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
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
                            placeholder="Sua senha segura"
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

                      {errorMessage && activeTab === 'login' ? (
                        <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                          {errorMessage}
                        </p>
                      ) : null}

                      <Button type="submit" className="w-full" disabled={isSubmitting !== null}>
                        {isSubmitting === 'login' ? 'Entrando...' : 'Entrar agora'}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register">
                    <form className="flex flex-col gap-4" onSubmit={handleRegisterSubmit}>
                      <div className="grid gap-2">
                        <Label htmlFor="register-email">E-mail</Label>
                        <div className="relative">
                          <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="register-email"
                            type="email"
                            autoComplete="email"
                            placeholder="time@empresa.com"
                            value={registerForm.email}
                            onChange={(event) =>
                              setRegisterForm((current) => ({
                                ...current,
                                email: event.target.value
                              }))
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="register-password">Senha</Label>
                        <div className="relative">
                          <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="register-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Use pelo menos 8 caracteres"
                            value={registerForm.password}
                            onChange={(event) =>
                              setRegisterForm((current) => ({
                                ...current,
                                password: event.target.value
                              }))
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="register-confirm-password">Confirmar senha</Label>
                        <div className="relative">
                          <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="register-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Repita a senha escolhida"
                            value={registerForm.confirmPassword}
                            onChange={(event) =>
                              setRegisterForm((current) => ({
                                ...current,
                                confirmPassword: event.target.value
                              }))
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>

                      {errorMessage && activeTab === 'register' ? (
                        <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                          {errorMessage}
                        </p>
                      ) : null}

                      <Button type="submit" className="w-full" disabled={isSubmitting !== null}>
                        {isSubmitting === 'register' ? 'Criando conta...' : 'Criar conta'}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">Acesso simples, base pronta</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    O login usa e-mail, senha criptografada e token JWT. A interface do painel
                    continua igual depois da autenticacao.
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
