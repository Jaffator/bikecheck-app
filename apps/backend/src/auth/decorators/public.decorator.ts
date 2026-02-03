import { SetMetadata } from '@nestjs/common';

// Tento řetězec je unikátní klíč, podle kterého Guard nálepku pozná
export const IS_PUBLIC_KEY = 'isPublic';

// Samotný dekorátor @Public()
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
