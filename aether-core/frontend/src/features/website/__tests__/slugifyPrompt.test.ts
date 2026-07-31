import { describe, expect, it } from 'vitest';
import { slugifyPrompt } from '../api';

describe('slugifyPrompt', () => {
  it('slugifies merchant prompts', () => {
    expect(slugifyPrompt('Handmade keramiek, rustiek!')).toBe('handmade-keramiek-rustiek');
  });

  it('falls back when prompt has no alphanumeric chars', () => {
    expect(slugifyPrompt('!!!')).toBe('store');
  });
});
