import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import type { NavItem } from './navigation';

/** Honest placeholder for modules that are planned but not built yet. It offers no fake actions. */
export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <>
      <PageHeader title={item.label} description={item.description} />
      <EmptyState
        icon={Hammer}
        title={`${item.label} chega na Fase ${item.phase}`}
        description="Este módulo ainda não foi construído. O plano completo está em PROJECT.md."
      />
    </>
  );
}
