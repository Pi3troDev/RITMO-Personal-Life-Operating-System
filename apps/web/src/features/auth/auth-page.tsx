import { zodResolver } from '@hookform/resolvers/zod';
import { loginInputSchema, registerInputSchema, type LoginInput, type RegisterInput } from '@ritmo/shared';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/app/shell/sidebar';
import { DEMO_MODE } from '@/lib/env';
import { errorMessage } from '@/lib/http';
import { useLogin, useRegister } from './api';

function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        {DEMO_MODE ? (
          <p className="mt-6 rounded-lg border bg-warning-soft px-3 py-2 text-center text-xs">
            Modo demonstração: qualquer e-mail válido e senha com 8+ caracteres entram com dados de exemplo.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });
  const from = (location.state as { from?: string } | null)?.from ?? '/meu-dia';

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para continuar de onde parou."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-medium text-foreground underline underline-offset-4">
            Criar conta
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          login.mutate(values, { onSuccess: () => navigate(from, { replace: true }) }),
        )}
      >
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" autoFocus className="h-10" {...register('email')} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="current-password" className="h-10" {...register('password')} aria-invalid={!!formState.errors.password} />
        </Field>
        {login.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(login.error)}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const signUp = useRegister();
  const { register, handleSubmit, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Um só lugar para tempo, hábitos, objetivos e dinheiro."
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-medium text-foreground underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) =>
          signUp.mutate(values, { onSuccess: () => navigate('/meu-dia', { replace: true }) }),
        )}
      >
        <Field label="Nome" error={formState.errors.name?.message}>
          <Input autoComplete="name" autoFocus className="h-10" {...register('name')} aria-invalid={!!formState.errors.name} />
        </Field>
        <Field label="E-mail" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" className="h-10" {...register('email')} aria-invalid={!!formState.errors.email} />
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          <Input type="password" autoComplete="new-password" className="h-10" {...register('password')} aria-invalid={!!formState.errors.password} />
        </Field>
        {signUp.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(signUp.error)}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" disabled={signUp.isPending}>
          {signUp.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  );
}
