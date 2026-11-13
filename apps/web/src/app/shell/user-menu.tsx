import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout, useSession } from '@/features/auth/api';

export function UserMenu() {
  const { data: user } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Menu da conta"
      >
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary-soft text-xs font-medium">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout.mutate(undefined, { onSettled: () => navigate('/entrar', { replace: true }) })}
        >
          <LogOut aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
