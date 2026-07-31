/**
 * Wave 16–18: validate OpenAPI 3.x YAML specs + Express path drift.
 * Usage: node scripts/validate-openapi.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import {
  ADMIN_DRIFT_TARGET,
  COMMERCE_DRIFT_TARGET,
  DRIFT_TARGETS,
  PLATFORM_DRIFT_TARGET,
  checkDrift,
} from './openapi-route-drift.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiDir = path.resolve(__dirname, '../openapi');

const SPECS = [
  'storefront.yaml',
  'website.yaml',
  'commerce.yaml',
  'admin.yaml',
  'platform.yaml',
];

async function validateSpecs() {
  let failed = false;
  for (const name of SPECS) {
    const file = path.join(openapiDir, name);
    if (!fs.existsSync(file)) {
      failed = true;
      console.error(`FAIL ${name}: file missing`);
      continue;
    }
    try {
      const api = await SwaggerParser.validate(file);
      const pathCount = api.paths ? Object.keys(api.paths).length : 0;
      console.log(`OK  ${name} (openapi ${api.openapi ?? api.swagger}; ${pathCount} paths)`);
    } catch (err) {
      failed = true;
      console.error(`FAIL ${name}:`, err.message ?? err);
    }
  }
  return !failed;
}

async function main() {
  const schemaOk = await validateSpecs();
  const driftTargets = [
    ...DRIFT_TARGETS,
    COMMERCE_DRIFT_TARGET,
    ADMIN_DRIFT_TARGET,
    PLATFORM_DRIFT_TARGET,
  ];
  const driftOk = await checkDrift(driftTargets);
  if (!schemaOk || !driftOk) process.exit(1);
}

main();
