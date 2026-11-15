import {
  changePasswordInputSchema,
  reviewOverviewSchema,
  updateProfileInputSchema,
  userSchema,
  type User,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  Download,
  Flame,
  KeyRound,
  LogOut,
  Moon,
  Sun,
  Target,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sessionKey, useLogout, useSession } from '@/features/auth/api';
import { formatDuration, formatPercent } from '@/lib/format';
import { api, errorMessage } from '@/lib/http';

function initialsOf(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Avatar com anel em gradiente; as iniciais vêm do nome. */
export function ProfileAvatar({
  name,
  className = 'size-9 text-xs',
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full p-[2px] ${className}`}
      style={{
        background:
          'conic-gradient(from 210deg, var(--primary), var(--sky), var(--violet), var(--coral), var(--primary))',
      }}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-card font-semibold tracking-tight">
        {initialsOf(name)}
      </span>
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone }}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular">{value}</p>
      </div>
    </div>
  );
}

function WeekSummary() {
  const { data } = useQuery({
    queryKey: ['reviews', 'weekly', 'current'],
    queryFn: () => api.get('/reviews/weekly/current', { schema: reviewOverviewSchema }),
  });
  const m = data?.metrics;
  return (
    <section
      aria-label="Sua semana (segunda a domingo)"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <Stat
        icon={CheckCircle2}
        label="Tarefas feitas"
        value={m ? String(m.tasksCompleted) : '—'}
        tone="var(--primary)"
      />
      <Stat
        icon={Clock}
        label="Tempo"
        value={m ? formatDuration(m.trackedMinutes) : '—'}
        tone="var(--sky)"
      />
      <Stat
        icon={Flame}
        label="Hábitos"
        value={m?.habits.rate != null ? formatPercent(m.habits.rate) : '—'}
        tone="var(--coral)"
      />
      <Stat
        icon={Target}
        label="Objetivos"
        value={m ? String(m.goals.length) : '—'}
        tone="var(--violet)"
      />
    </section>
  );
}

function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const [capacity, setCapacity] = useState(String(user.dailyCapacityMinutes / 60));
  const [weekStart, setWeekStart] = useState(String(user.weekStartsOn));
  const save = useMutation({
    mutationFn: (input: unknown) => api.patch('/me', input, { schema: userSchema }),
    onSuccess: (updated) => {
      queryClient.setQueryData(sessionKey, updated);
      void queryClient.invalidateQueries({ queryKey: ['day'] });
      toast.success('Perfil atualizado');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = updateProfileInputSchema.safeParse({
      name,
      dailyCapacityMinutes: Math.round(Number(capacity.replace(',', '.')) * 60),
      weekStartsOn: Number(weekStart),
    });
    if (!parsed.success)
      return void toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
    save.mutate(parsed.data);
  }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-5">
      <h2 className="text-sm font-semibold">Seus dados</h2>
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Nome</Label>
        <Input
          id="profile-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="profile-capacity">Horas realistas por dia</Label>
          <Input
            id="profile-capacity"
            inputMode="decimal"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Semana começa em</Label>
          <Select value={weekStart} onValueChange={setWeekStart}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Segunda-feira</SelectItem>
              <SelectItem value="0">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        A capacidade diária é o limite que o Meu Dia usa para avisar quando o planejado passou do
        realista.
      </p>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (input: unknown) => api.post('/me/password', input),
    onSuccess: () => {
      toast.success('Senha alterada. Entre de novo com a senha nova.');
      queryClient.setQueryData(sessionKey, null);
      navigate('/entrar', { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = changePasswordInputSchema.safeParse({
      currentPassword: current,
      newPassword: next,
    });
    if (!parsed.success)
      return void toast.error(parsed.error.issues[0]?.message ?? 'Dados inválidos');
    change.mutate(parsed.data);
  }

  return (
    <form onSubmit={submit} className="surface space-y-4 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden /> Trocar senha
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Senha atual</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">Nova senha</Label>
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
      </div>
      <Button type="submit" variant="outline" disabled={change.isPending || !current || !next}>
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  );
}

export function ProfilePage() {
  const { data: user } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) return null;

  async function exportData() {
    try {
      const data = await api.get('/export', { schema: z.unknown() });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ritmo-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const since = new Date(user.createdAt).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  const dark = resolvedTheme !== 'light';

  return (
    <div className="space-y-5">
      <section className="surface-hero rise flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <ProfileAvatar name={user.name} className="size-24 text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-3xl tracking-tight">{user.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-subtle-foreground">
            No RITMO desde {since} · {user.timezone.replace('_', ' ')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            logout.mutate(undefined, { onSettled: () => navigate('/entrar', { replace: true }) })
          }
        >
          <LogOut aria-hidden /> Sair
        </Button>
      </section>

      <WeekSummary />

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileForm user={user} />
        <div className="space-y-5">
          <section className="surface flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-sm font-semibold">Aparência</h2>
              <p className="text-xs text-muted-foreground">Tema {dark ? 'escuro' : 'claro'}</p>
            </div>
            <Button variant="outline" onClick={() => setTheme(dark ? 'light' : 'dark')}>
              {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}{' '}
              {dark ? 'Usar claro' : 'Usar escuro'}
            </Button>
          </section>
          <section className="surface flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-sm font-semibold">Seus dados são seus</h2>
              <p className="text-xs text-muted-foreground">
                Baixe tudo que você registrou, em JSON.
              </p>
            </div>
            <Button variant="outline" onClick={() => void exportData()}>
              <Download aria-hidden /> Exportar
            </Button>
          </section>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
