import { ipcMain } from 'electron';
import { validateAndActivateLicense } from '../database/operations/licenseOperations';

export const LICENSE_VALIDATE_CHANNEL = 'license:validate';

export function registerLicenseIPC() {
  ipcMain.handle(LICENSE_VALIDATE_CHANNEL, async (_event, license: string) => {
    try {
      const result = await validateAndActivateLicense(license);
      return result;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });
} 