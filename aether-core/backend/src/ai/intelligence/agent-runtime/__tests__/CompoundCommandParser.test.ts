import { tryParseCompound, COMPOUND_SPLIT } from '../CompoundCommandParser';

describe('CompoundCommandParser', () => {
  it('splits on Dutch connectors', () => {
    const result = tryParseCompound(
      'Verhoog prijzen voor earbuds en daarna sync Nordic leverancier'
    );
    expect(result).not.toBeNull();
    expect(result!.parts).toHaveLength(2);
    expect(result!.parts[0]).toContain('Verhoog prijzen');
    expect(result!.parts[1]).toContain('sync Nordic');
  });

  it('splits on vervolgens', () => {
    const result = tryParseCompound('Haal marges op vervolgens maak goedkeuring aan');
    expect(result?.parts).toHaveLength(2);
  });

  it('returns null for single-step commands', () => {
    expect(tryParseCompound('Verhoog alle prijzen met 5%')).toBeNull();
  });

  it('exports split pattern', () => {
    expect(COMPOUND_SPLIT.test('foo en daarna bar')).toBe(true);
  });
});
