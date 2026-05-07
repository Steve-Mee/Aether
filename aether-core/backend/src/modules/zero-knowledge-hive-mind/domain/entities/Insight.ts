export interface Insight {
  id: string;
  merchantId: string;           // Hashed or anonymized
  category: 'pricing' | 'conversion' | 'trend' | 'inventory' | 'marketing';
  metric: string;               // e.g. "average_price", "conversion_rate"
  value: number;
  sampleSize: number;
  confidence: number;           // 0-1
  timestamp: Date;
  zkProof?: string;             // Future: Zero-Knowledge proof
}