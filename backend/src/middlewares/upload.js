import multer from 'multer';

export const MAX_EXCEL_FILE_SIZE_MB = 10;
const MAX_EXCEL_FILE_SIZE_BYTES = MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EXCEL_FILE_SIZE_BYTES,
    files: 10
  }
});
