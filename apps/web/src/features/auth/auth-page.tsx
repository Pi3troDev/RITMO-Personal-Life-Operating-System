import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginInputSchema,
  registerInputSchema,
  type LoginInput,
  type RegisterInput,
} from '@ritmo/shared';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/app/shell/sidebar';
import { DEMO_MODE } from '@/lib/env';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useLogin, useRegister } from './api';

const RINGS = [
  { r: 46, w: 5, len: 190, color: 'var(--primary)', speed: '26s', turn: '360deg', delay: '0.1s' },
  { r: 36, w: 5, len: 120, color: 'var(--violet)', speed: '34s', turn: '-360deg', delay: '0.25s' },
  { r: 26, w: 5, len: 95, color: 'var(--sky)', speed: '22s', turn: '360deg', delay: '0.4s' },
  { r: 16, w: 5, len: 44, color: 'var(--coral)', speed: '18s', turn: '-360deg', delay: '0.55s' },
] as const;

const CHIPS = [
  { label: 'Hábitos', color: 'var(--violet)', pos: 'left-0 top-[12%]' },
  { label: 'Foco do dia', color: 'var(--primary)', pos: 'right-0 top-[4%]' },
  { label: 'Objetivos', color: 'var(--sky)', pos: '-right-2 bottom-[18%]' },
  { label: 'Finanças', color: 'var(--coral)', pos: 'left-2 bottom-[6%]' },
] as const;

/** Anéis do dia girando em volta do pulso do RITMO. */
function Rings({ size }: { size?: string }) {
  return (
    <div
      className="auth-rings"
      style={size ? ({ '--rings-size': size } as React.CSSProperties) : undefined}
      aria-hidden
    >
      <svg viewBox="0 0 100 100">
        {RINGS.map((ring) => (
          <g key={ring.r}>
            <circle className="auth-ring-track" cx="50" cy="50" r={ring.r} strokeWidth={ring.w} />
            <circle
              className="auth-ring"
              cx="50"
              cy="50"
              r={ring.r}
              strokeWidth={ring.w}
              stroke={ring.color}
              style={
                {
                  color: ring.color,
                  '--len': ring.len,
                  '--speed': ring.speed,
                  '--turn': ring.turn,
                  '--delay': ring.delay,
                } as React.CSSProperties
              }
            />
          </g>
        ))}
      </svg>
      <div className="auth-core absolute inset-0 flex items-center justify-center">
        <span
          className="flex size-[19%] items-center justify-center rounded-[28%] border border-white/40 text-primary-foreground shadow-[0_0_40px_-4px_var(--primary),inset_0_1px_0_rgb(255_255_255/0.5)]"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in oklab, var(--primary) 85%, white), var(--primary) 50%, color-mix(in oklab, var(--primary) 50%, var(--violet)))',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-[58%]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="auth-pulse" pathLength={60} d="M3 12h3l2.5-6 4 12 2.5-6H21" />
          </svg>
        </span>
      </div>
      {size
        ? null
        : CHIPS.map((chip, i) => (
            <span
              key={chip.label}
              className={cn(
                'auth-chip glass rounded-full px-3 py-1.5 text-xs font-medium',
                chip.pos,
              )}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span
                className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
                style={{ background: chip.color, boxShadow: `0 0 10px ${chip.color}` }}
              />
              {chip.label}
            </span>
          ))}
    </div>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  shake,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  shake?: boolean;
}) {
  return (
    <div className="auth-stage">
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="auth-grid" aria-hidden />

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-10">
        {/* Vitrine (desktop) */}
        <section className="hidden lg:block">
          <div className="rise" style={{ '--i': 0 } as React.CSSProperties}>
            <Logo />
          </div>
          <h2
            className="rise mt-10 font-serif text-5xl leading-[1.1] tracking-tight xl:text-6xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            Seu dia, no seu{' '}
            <span className="auth-words">
              <span style={{ '--i': 0 } as React.CSSProperties} className="auth-gradient-text">
                ritmo.
              </span>
              <span style={{ '--i': 1 } as React.CSSProperties} className="auth-gradient-text">
                foco.
              </span>
              <span style={{ '--i': 2 } as React.CSSProperties} className="auth-gradient-text">
                tempo.
              </span>
            </span>
          </h2>
          <p
            className="rise mt-5 max-w-md text-base text-muted-foreground"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            Tempo, hábitos, objetivos e dinheiro em um só lugar — para você viver de acordo com o
            que quer construir.
          </p>
          <div
            className="rise mt-10 flex justify-center pr-10"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <Rings />
          </div>
        </section>

        {/* Formulário */}
        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-5 lg:hidden">
            <Rings size="9.5rem" />
            <p className="text-center font-serif text-2xl tracking-tight">
              Seu dia, no seu <span className="auth-gradient-text">ritmo.</span>
            </p>
          </div>
          <div
            className={cn(
              'auth-card glass-strong rise rounded-3xl p-6 sm:p-8',
              shake && 'auth-shake',
            )}
            style={{ '--i': 2 } as React.CSSProperties}
          >
            <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
            {DEMO_MODE ? (
              <p className="mt-5 rounded-lg border bg-warning-soft px-3 py-2 text-center text-xs">
                Modo demonstração: qualquer e-mail válido e senha com 8+ caracteres entram com dados
                de exemplo.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative [&_input]:h-12 [&_input]:rounded-xl [&_input]:pl-10 [&_input]:text-base">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        {children}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Campo de senha com botão de mostrar/ocultar. */
function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-1.5 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </>
  );
}

function SubmitButton({ pending, idle, busy }: { pending: boolean; idle: string; busy: string }) {
  return (
    <Button type="submit" className="h-12 w-full rounded-xl text-base" disabled={pending}>
      {pending ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden
          />
          {busy}
        </>
      ) : (
        <>
          {idle} <ArrowRight aria-hidden />
        </>
      )}
    </Button>
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
      shake={login.isError}
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
        <Field label="E-mail" icon={Mail} error={formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            {...register('email')}
            aria-invalid={!!formState.errors.email}
          />
        </Field>
        <Field label="Senha" icon={Lock} error={formState.errors.password?.message}>
          <PasswordInput
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={!!formState.errors.password}
          />
        </Field>
        {login.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(login.error)}
          </p>
        ) : null}
        <SubmitButton pending={login.isPending} idle="Entrar" busy="Entrando…" />
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
      shake={signUp.isError}
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
        <Field label="Nome" icon={User} error={formState.errors.name?.message}>
          <Input
            autoComplete="name"
            autoFocus
            {...register('name')}
            aria-invalid={!!formState.errors.name}
          />
        </Field>
        <Field label="E-mail" icon={Mail} error={formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={!!formState.errors.email}
          />
        </Field>
        <Field label="Senha" icon={Lock} error={formState.errors.password?.message}>
          <PasswordInput
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={!!formState.errors.password}
          />
        </Field>
        {signUp.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage(signUp.error)}
          </p>
        ) : null}
        <SubmitButton pending={signUp.isPending} idle="Criar conta" busy="Criando conta…" />
      </form>
    </AuthLayout>
  );
}
