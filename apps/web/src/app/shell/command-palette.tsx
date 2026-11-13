import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { NAV_GROUPS, SYSTEM_ITEMS } from '../navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: () => void;
}

export function CommandPalette({ open, onOpenChange, onCapture }: CommandPaletteProps) {
  const navigate = useNavigate();

  function go(path: string) {
    onOpenChange(false);
    navigate(path);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ir para"
      description="Busque um módulo ou uma ação"
    >
      <CommandInput placeholder="Para onde você quer ir?" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ações">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onCapture();
            }}
          >
            <Plus aria-hidden />
            Adicionar rápido
            <CommandShortcut>A</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {[...NAV_GROUPS, { label: 'Sistema', items: SYSTEM_ITEMS }].map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.path} value={`${item.label} ${group.label}`} onSelect={() => go(item.path)}>
                  <Icon aria-hidden />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
