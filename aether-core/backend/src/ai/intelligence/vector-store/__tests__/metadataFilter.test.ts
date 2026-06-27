import { matchesMetadataFilter, buildMetadataFilterSql } from '../metadataFilter';

describe('metadataFilter', () => {
  describe('matchesMetadataFilter', () => {
    it('passes when filter is empty', () => {
      expect(matchesMetadataFilter({ memoryType: 'episodic' }, undefined)).toBe(true);
      expect(matchesMetadataFilter(undefined, {})).toBe(true);
    });

    it('matches single string value', () => {
      expect(
        matchesMetadataFilter({ memoryType: 'episodic', intent: 'PRICE_UPDATE' }, {
          memoryType: 'episodic',
        })
      ).toBe(true);
      expect(matchesMetadataFilter({ memoryType: 'interaction' }, { memoryType: 'episodic' })).toBe(
        false
      );
    });

    it('matches array of allowed values', () => {
      expect(
        matchesMetadataFilter({ memoryType: 'semantic' }, {
          memoryType: ['episodic', 'semantic'],
        })
      ).toBe(true);
      expect(
        matchesMetadataFilter({ memoryType: 'interaction' }, {
          memoryType: ['episodic', 'semantic'],
        })
      ).toBe(false);
    });
  });

  describe('buildMetadataFilterSql', () => {
    it('builds parameterized IN clause for array filter', () => {
      const { clause, params } = buildMetadataFilterSql(
        { memoryType: ['episodic', 'semantic'] },
        3
      );
      expect(clause).toContain('memoryType');
      expect(clause).toContain('IN');
      expect(params).toEqual(['episodic', 'semantic']);
    });

    it('builds equality clause for single value', () => {
      const { clause, params } = buildMetadataFilterSql({ memoryType: 'interaction' }, 2);
      expect(clause).toContain("= $2");
      expect(params).toEqual(['interaction']);
    });
  });
});
