import { Request, Response } from 'express';
import fs from 'fs';
import { requireViewer } from '../../../../shared/security/rbac';
import {
  guessMimeType,
  resolveMediaUploadDir,
  resolveSafeMediaAbsolutePath,
} from '../../infrastructure/media/LocalDiskMediaStore';

export class MediaController {
  static serve = [
    requireViewer,
    (req: Request, res: Response): void => {
      const mediaTenantId = req.params.mediaTenantId;
      const fileName = req.params.fileName;
      const requestTenantId = req.tenantId;

      if (!requestTenantId || mediaTenantId !== requestTenantId) {
        res.status(403).json({
          error: { code: 'MEDIA_TENANT_FORBIDDEN', message: 'Cross-tenant media access denied' },
        });
        return;
      }

      const absolute = resolveSafeMediaAbsolutePath(
        resolveMediaUploadDir(),
        mediaTenantId,
        fileName
      );
      if (!absolute) {
        res.status(400).json({
          error: { code: 'MEDIA_INVALID_PATH', message: 'Invalid media path' },
        });
        return;
      }

      if (!fs.existsSync(absolute)) {
        res.status(404).json({
          error: { code: 'MEDIA_NOT_FOUND', message: 'Media not found' },
        });
        return;
      }

      res.setHeader('Content-Type', guessMimeType(fileName));
      res.setHeader('Cache-Control', 'private, max-age=3600');
      fs.createReadStream(absolute).pipe(res);
    },
  ];
}
