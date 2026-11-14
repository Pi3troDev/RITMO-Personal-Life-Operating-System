import argon2 from 'argon2';

// Argon2id com os parâmetros recomendados pela OWASP (19 MiB, 2 iterações, 1 thread).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => argon2.hash(password, OPTIONS);

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Hash fixo usado para gastar o mesmo tempo quando o e-mail não existe (evita enumeração). */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$Q2l5YXBsYWNlaG9sZGVyaGFzaHBsYWNlaG9sZGVy';
