import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark an endpoint or controller as publicly accessible without
 * requiring a signed-in session or permission policy.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
