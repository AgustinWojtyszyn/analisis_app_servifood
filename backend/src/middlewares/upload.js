import multer from 'multer';
import { validateUploadedExcelIdentity } from '../controllers/analysisController.utils.js';

export const MAX_EXCEL_FILE_SIZE_MB = 10;
export const MAX_EXCEL_FILE_SIZE_BYTES = MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EXCEL_FILE_SIZE_BYTES,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    try {
      validateUploadedExcelIdentity({
        originalname: file?.originalname,
        mimetype: file?.mimetype
      });
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});
