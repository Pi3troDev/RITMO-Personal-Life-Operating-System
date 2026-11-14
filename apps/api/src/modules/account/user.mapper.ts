import type { User as UserDto } from '@ritmo/shared';
import type { User, UserSettings } from '../../generated/prisma/client';

export function toUserDto(user: User, settings: UserSettings | null): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: settings?.timezone ?? 'America/Sao_Paulo',
    weekStartsOn: (settings?.weekStartsOn === 0 ? 0 : 1) as 0 | 1,
    dailyCapacityMinutes: settings?.dailyCapacityMinutes ?? 360,
    createdAt: user.createdAt.toISOString(),
  };
}
