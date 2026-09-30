import { describe, expect, it } from 'vitest';
import { mapSubdomains, type CrtshEntry } from './mapper';

const entry = (name_value: string): CrtshEntry => ({
  name_value,
  not_before: '2026-01-01T00:00:00',
  not_after: '2026-04-01T00:00:00',
  issuer_name: 'C=US, O=Let\'s Encrypt, CN=R11',
});

describe('mapSubdomains', () => {
  it('deduplica, quita comodines y descarta nombres ajenos', () => {
    const result = mapSubdomains(
      [
        entry('*.example.com\nexample.com'),
        entry('api.example.com\nAPI.example.com'),
        entry('mail.example.com\nexample.com.evil.net'),
      ],
      'example.com',
    );

    expect(result).toEqual([
      { type: 'subdomain', value: 'api.example.com' },
      { type: 'subdomain', value: 'mail.example.com' },
    ]);
  });
});
