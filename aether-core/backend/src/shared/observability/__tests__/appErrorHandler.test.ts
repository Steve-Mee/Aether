import * as fs from 'fs';
import * as path from 'path';

describe('app error handler', () => {
  it('fallback handler does not call captureServerException (avoids duplicate Sentry events)', () => {
    const appSource = fs.readFileSync(path.resolve(__dirname, '../../../app.ts'), 'utf8');
    const fallbackMatch = appSource.match(
      /app\.use\(\(err:[\s\S]*?res\.status\([\s\S]*?\}\);[\s\S]*?\}\);/
    );
    expect(fallbackMatch).not.toBeNull();
    expect(fallbackMatch![0]).not.toContain('captureServerException');
    expect(appSource).toContain('setupExpressErrorHandler(app');
  });
});
