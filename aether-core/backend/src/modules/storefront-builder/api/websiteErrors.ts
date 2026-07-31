import { Response } from 'express';
import {
  DuplicateSiteSlugError,
} from '../application/use-cases/CreateSiteProjectUseCase';
import { ProjectNotFoundError } from '../application/use-cases/CreateRevisionUseCase';
import {
  QaBelowThresholdError,
  QA_PUBLISH_THRESHOLD,
} from '../application/use-cases/ProposePublishUseCase';
import { RevisionNotFoundError } from '../application/use-cases/ListPagesUseCase';
import {
  PageNotFoundForCopyError,
} from '../application/use-cases/UpdatePageCopyUseCase';
import { InvalidStorefrontSlugError } from '../domain/validateStorefrontSlug';
import { CodegenRejectedError } from '../infrastructure/codegen/CodegenRejectedError';

export function sendWebsiteError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

export class RevisionNotReadyError extends Error {
  constructor(revisionId: string) {
    super(`Site revision is not ready: ${revisionId}`);
    this.name = 'RevisionNotReadyError';
  }
}

export function handleWebsiteError(res: Response, err: unknown): boolean {
  if (err instanceof InvalidStorefrontSlugError) {
    sendWebsiteError(res, 400, 'VALIDATION_FAILED', err.message);
    return true;
  }
  if (err instanceof DuplicateSiteSlugError) {
    sendWebsiteError(res, 409, 'SLUG_TAKEN', err.message);
    return true;
  }
  if (err instanceof ProjectNotFoundError) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof RevisionNotFoundError) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof PageNotFoundForCopyError) {
    sendWebsiteError(res, 404, 'PROJECT_NOT_FOUND', err.message);
    return true;
  }
  if (err instanceof RevisionNotReadyError) {
    sendWebsiteError(res, 409, 'REVISION_NOT_READY', err.message);
    return true;
  }
  if (err instanceof QaBelowThresholdError) {
    sendWebsiteError(res, 422, 'QA_BELOW_THRESHOLD', err.message, {
      qaScore: err.qaScore,
      threshold: QA_PUBLISH_THRESHOLD,
    });
    return true;
  }
  if (err instanceof CodegenRejectedError) {
    sendWebsiteError(res, 422, 'CODEGEN_REJECTED', err.message, err.details);
    return true;
  }
  return false;
}
