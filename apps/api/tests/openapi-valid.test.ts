import SwaggerParser from '@apidevtools/swagger-parser';
import { describe, expect, it } from 'vitest';
import { testBundle } from './helpers';

describe('documento OpenAPI', () => {
  it('é válido segundo a especificação OpenAPI 3.1 (validador externo)', async () => {
    // `validate` resolve todos os $ref e confere o documento inteiro contra o schema oficial.
    const api = await SwaggerParser.validate(structuredClone(testBundle.openapi) as never);
    expect(api.info.title).toBe('RITMO API');
    expect(Object.keys(api.paths ?? {}).length).toBeGreaterThan(100);
  });
});
