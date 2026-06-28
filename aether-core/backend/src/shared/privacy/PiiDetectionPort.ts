export interface PiiScanResult {
  safe: boolean;
  categories: string[];
  source: 'regex' | 'nlp' | 'none';
}

export interface PiiDetectionPort {
  scan(text: string, options?: { allowStructuredMetrics?: boolean }): Promise<PiiScanResult>;
}
