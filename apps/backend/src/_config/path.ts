import path from 'path';

export const BACKEND_ROOT = path.resolve(process.cwd());
export const PUBLIC_DIR = path.join(BACKEND_ROOT, 'public');
export const TEMP_FILES_DIR = path.join(PUBLIC_DIR, 'temp');
