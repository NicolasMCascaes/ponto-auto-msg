import { useState, type FormEvent } from 'react';
import { KeyRoundIcon, MailIcon, ShieldCheckIcon, UserRoundPlusIcon } from 'lucide-react';
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
import { api, type AuthUser } from '@/lib/api';

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

export function UsersPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCreatedUser, setLastCreatedUser] = useState<AuthUser | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!isValidEmail(email)) {
      setErrorMessage('Informe um e-mail válido.');
      return;
    }

    if (password.trim().length < 8) {
      setErrorMessage('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = await api.createUser({ email, password });
      setLastCreatedUser(payload.data.user);
      setForm(initialFormState);
      toast.success('Usuário criado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar o usuário.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3">
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
            Área administrativa
          </Badge>
          <CardTitle className="text-3xl tracking-tight">Criar usuários</CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            Novas contas passam a existir somente por aqui. O e-mail
            <span className="font-medium text-foreground"> medeiroscascaes@gmail.com </span>
            continua sendo admin; os demais usuários entram como user.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserRoundPlusIcon className="size-5 text-primary" />
              Novo usuário
            </CardTitle>
            <CardDescription>
              Defina e-mail e senha inicial para liberar o acesso ao painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="user-email">E-mail</Label>
                <div className="relative">
                  <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-email"
                    type="email"
                    autoComplete="email"
                    placeholder="colaborador@empresa.com"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-password">Senha inicial</Label>
                <div className="relative">
                  <KeyRoundIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Use pelo menos 8 caracteres"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
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

              <Button type="submit" className="w-full sm:w-fit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Criar usuário'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheckIcon className="size-5 text-primary" />
              Regras
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm leading-6 text-muted-foreground">
            <p>O cadastro público foi desativado. Só usuários admin autenticados conseguem criar contas.</p>
            <p>Usuários criados por aqui não tomam sua sessão atual. Cada pessoa entra depois com o próprio login.</p>
            {lastCreatedUser ? (
              <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-4">
                <p className="font-medium text-foreground">Último usuário criado</p>
                <p className="mt-1">{lastCreatedUser.email}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em]">{lastCreatedUser.role}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-4">
                Depois de criar uma conta, o resumo aparece aqui.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
