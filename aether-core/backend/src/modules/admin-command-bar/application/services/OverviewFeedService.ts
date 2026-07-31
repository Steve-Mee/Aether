import type { ProactiveSuggestionDto } from '../../../../ai/intelligence/proactive/ProactiveSuggestionService';
import type { ActivityFeedService } from './ActivityFeedService';
import type { OverviewFeedPort } from '../ports/OverviewFeedPort';
import { isOverviewFeedReadLegacy } from './overviewFeedConfig';
import {
  buildOverviewFeedFromDb,
  listOverviewFeedEventsSince as listOverviewFeedEventsSinceFromDb,
} from './overview/overviewFeedDbBuilder';
import { buildOverviewFeedLegacy } from './overview/overviewFeedLegacyBuilder';
import type {
  OverviewCursor,
  OverviewFeedItem,
  OverviewFeedQuery,
  OverviewFeedResponse,
} from './overview/overviewFeedTypes';

export type {
  OverviewFeedKind,
  OverviewCursor,
  OverviewFeedItem,
  OverviewFeedQuery,
  OverviewFeedMeta,
  OverviewFeedResponse,
} from './overview/overviewFeedTypes';

export {
  encodeOverviewCursor,
  decodeOverviewCursor,
  compareItems,
} from './overview/overviewFeedCursor';

export {
  activityToItem,
  approvalToItem,
  goalToItem,
} from './overview/overviewFeedMappers';

export { overviewHighlightHref } from './overview/overviewHighlightHref';

export class OverviewFeedService {
  constructor(
    private overviewFeedPort: OverviewFeedPort,
    private activityFeedService: ActivityFeedService,
  ) {}

  async buildOverviewFeed(
    query: OverviewFeedQuery,
    proactiveDtos: ProactiveSuggestionDto[],
  ): Promise<OverviewFeedResponse> {
    if (isOverviewFeedReadLegacy()) {
      return buildOverviewFeedLegacy(
        this.overviewFeedPort,
        this.activityFeedService,
        query,
        proactiveDtos,
      );
    }

    try {
      const dbFeed = await buildOverviewFeedFromDb(this.overviewFeedPort, query);
      if (dbFeed.items.length > 0 || query.cursor) {
        return dbFeed;
      }
      const count = await this.overviewFeedPort.countFeedEvents(query.tenantId);
      if (count > 0) return dbFeed;
    } catch {
      return buildOverviewFeedLegacy(
        this.overviewFeedPort,
        this.activityFeedService,
        query,
        proactiveDtos,
      );
    }

    return buildOverviewFeedLegacy(
      this.overviewFeedPort,
      this.activityFeedService,
      query,
      proactiveDtos,
    );
  }

  async listOverviewFeedEventsSince(
    tenantId: string,
    sinceCursor: OverviewCursor | null,
    limit = 50,
  ): Promise<OverviewFeedItem[]> {
    return listOverviewFeedEventsSinceFromDb(
      this.overviewFeedPort,
      tenantId,
      sinceCursor,
      limit,
    );
  }
}
