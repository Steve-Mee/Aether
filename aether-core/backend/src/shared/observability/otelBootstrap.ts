import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { VERSION } from '../../app';

let sdk: NodeSDK | null = null;

/**
 * Initializes OpenTelemetry SDK export (OTLP when configured, console fallback otherwise).
 * Span logging via telemetry.ts remains active when OTEL_ENABLED !== 'false'.
 */
export function initOtelSdk(): boolean {
  if (process.env.OTEL_ENABLED === 'false') return false;
  if (sdk) return true;

  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
    : new ConsoleSpanExporter();

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'aether-core',
      [SemanticResourceAttributes.SERVICE_VERSION]: VERSION,
    }),
    traceExporter,
  });

  sdk.start();
  return true;
}

export function isOtelSdkActive(): boolean {
  return sdk !== null;
}

export async function shutdownOtelSdk(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
}
