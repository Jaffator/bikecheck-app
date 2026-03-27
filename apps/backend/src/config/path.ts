import path from 'path';

export const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
export const PUBLIC_DIR = path.join(BACKEND_ROOT, 'public');
export const BIKE_IMAGES_DIR = path.join(PUBLIC_DIR, 'images', 'bikes');
