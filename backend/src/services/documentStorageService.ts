/**
 * Production document storage delegates to the object storage abstraction.
 * Never reports CLEAN without a configured scanner. Never returns mock bytes.
 */
import { objectStorageService } from './objectStorageService';

export const documentStorageService = objectStorageService;
export default objectStorageService;
