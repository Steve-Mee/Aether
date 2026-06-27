export const VECTOR_DIMENSION = 384;

export interface VectorDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

export interface VectorQuery {
  embedding: number[];
  limit?: number;
  minScore?: number;
  /** Filter matches by metadata fields, e.g. { memoryType: ['episodic', 'semantic'] } */
  metadataFilter?: Record<string, string | string[]>;
}

export interface VectorMatch {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}
