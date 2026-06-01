import { trace, SpanStatusCode } from '@opentelemetry/api';

type ActiveSpan = {
  name: string;
  startMs: number;
  attributes: Record<string, string | number>;
  otelSpan?: ReturnType<ReturnType<typeof trace.getTracer>['startSpan']>;
};

const activeSpans: ActiveSpan[] = [];
const tracer = trace.getTracer('aether-core');

export const telemetry = {
  startSpan(name: string, attributes: Record<string, string | number> = {}): void {
    if (process.env.OTEL_ENABLED === 'false') return;

    const otelSpan = tracer.startSpan(name);
    for (const [key, value] of Object.entries(attributes)) {
      otelSpan.setAttribute(key, value);
    }

    activeSpans.push({ name, startMs: Date.now(), attributes, otelSpan });
  },

  endSpan(name: string, attributes: Record<string, string | number> = {}): void {
    const idx = activeSpans.findIndex((s) => s.name === name);
    if (idx === -1) return;
    const span = activeSpans.splice(idx, 1)[0];
    const durationMs = Date.now() - span.startMs;

    if (span.otelSpan) {
      for (const [key, value] of Object.entries(attributes)) {
        span.otelSpan.setAttribute(key, value);
      }
      const statusCode = typeof attributes.status === 'number' && attributes.status >= 400
        ? SpanStatusCode.ERROR
        : SpanStatusCode.OK;
      span.otelSpan.setStatus({ code: statusCode });
      span.otelSpan.end();
    }

    console.log(
      JSON.stringify({
        type: 'span',
        name: span.name,
        durationMs,
        ...span.attributes,
        ...attributes,
      })
    );
  },

  recordEvent(name: string, attributes: Record<string, unknown> = {}): void {
    if (process.env.OTEL_ENABLED === 'false') return;

    const otelSpan = trace.getActiveSpan();
    if (otelSpan) {
      otelSpan.addEvent(name, attributes as Record<string, string | number | boolean>);
    }

    console.log(
      JSON.stringify({ type: 'event', name, timestamp: new Date().toISOString(), ...attributes })
    );
  },
};
