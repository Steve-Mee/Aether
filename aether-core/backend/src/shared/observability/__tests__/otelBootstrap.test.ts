import { initOtelSdk, isOtelSdkActive, shutdownOtelSdk } from '../otelBootstrap';

describe('otelBootstrap', () => {
  const originalOtelEnabled = process.env.OTEL_ENABLED;
  const originalOtlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  afterEach(async () => {
    await shutdownOtelSdk();
    if (originalOtelEnabled === undefined) delete process.env.OTEL_ENABLED;
    else process.env.OTEL_ENABLED = originalOtelEnabled;
    if (originalOtlpEndpoint === undefined) delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    else process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalOtlpEndpoint;
  });

  it('initializes SDK with console exporter when OTLP endpoint is unset', () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.OTEL_ENABLED = 'true';

    const started = initOtelSdk();
    expect(started).toBe(true);
    expect(isOtelSdkActive()).toBe(true);
  });

  it('does not start SDK when OTEL_ENABLED is false', () => {
    process.env.OTEL_ENABLED = 'false';
    const started = initOtelSdk();
    expect(started).toBe(false);
    expect(isOtelSdkActive()).toBe(false);
  });

  it('initializes SDK with OTLP exporter when endpoint is configured', () => {
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318/v1/traces';

    const started = initOtelSdk();
    expect(started).toBe(true);
    expect(isOtelSdkActive()).toBe(true);
  });
});
