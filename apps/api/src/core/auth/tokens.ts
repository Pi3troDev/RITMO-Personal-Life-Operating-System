import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { jwtVerify, SignJWT } from 'jose';
import { unauthorized } from '../errors';

const ISSUER = 'ritmo';

export interface AuthVerifier {
  fromRequest(req: Request): Promise<string>;
}

export function createTokenService(secret: string, accessTtlSeconds: number) {
  const key = new TextEncoder().encode(secret);

  async function signAccessToken(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${accessTtlSeconds}s`)
      .sign(key);
  }

  async function verifyAccessToken(token: string): Promise<string> {
    try {
      const { payload } = await jwtVerify(token, key, { issuer: ISSUER, algorithms: ['HS256'] });
      if (!payload.sub) throw new Error('sem subject');
      return payload.sub;
    } catch {
      throw unauthorized();
    }
  }

  const verifier: AuthVerifier = {
    async fromRequest(req) {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw unauthorized();
      return verifyAccessToken(header.slice(7));
    },
  };

  return { signAccessToken, verifyAccessToken, verifier };
}

export type TokenService = ReturnType<typeof createTokenService>;

/** Refresh token opaco: 256 bits aleatórios. Só o hash vai para o banco. */
export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
