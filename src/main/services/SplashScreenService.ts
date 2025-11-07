import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { getActiveSplashScreens, getNewSplashScreens, SplashScreenData } from '../database/operations/splashScreenOperations';
import * as https from 'https';
import * as http from 'http';

export interface SplashScreenContent {
  type: 'image' | 'video';
  src: string;
  name: string;
  order: number;
}

export class SplashScreenService {
  private static instance: SplashScreenService;
  private splashDir: string;
  private machineCode: string;
  private repositoryBaseUrl: string;

  private constructor() {
    console.log('[SplashScreenService] Initializing service...');
    this.machineCode = process.env.MACHINE_CODE || 'MACHINE-1';
    this.repositoryBaseUrl = process.env.SPLASH_REPOSITORY_URL || 'https://tu-repositorio.com/splash/';
    this.splashDir = path.join(app.getPath('userData'), 'splash-screens');
    console.log('[SplashScreenService] Machine code:', this.machineCode);
    console.log('[SplashScreenService] Repository URL:', this.repositoryBaseUrl);
    console.log('[SplashScreenService] Splash directory:', this.splashDir);
    this.ensureSplashDir();
  }

  public static getInstance(): SplashScreenService {
    if (!SplashScreenService.instance) {
      SplashScreenService.instance = new SplashScreenService();
    }
    return SplashScreenService.instance;
  }

  private ensureSplashDir(): void {
    if (!fs.existsSync(this.splashDir)) {
      fs.mkdirSync(this.splashDir, { recursive: true });
    }
  }

  /**
   * Download a splash screen file from repository
   */
  private async downloadFile(url: string, localPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`[SplashScreenService] Starting download from: ${url}`);
      console.log(`[SplashScreenService] Saving to: ${localPath}`);
      
      const file = fs.createWriteStream(localPath);
      const protocol = url.startsWith('https') ? https : http;
      
      const request = protocol.get(url, (response) => {
        console.log(`[SplashScreenService] Response status: ${response.statusCode}`);
        console.log(`[SplashScreenService] Content-Length: ${response.headers['content-length']}`);
        
        if (response.statusCode === 200) {
          let downloadedBytes = 0;
          const totalBytes = parseInt(response.headers['content-length'] || '0');
          
          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
              console.log(`[SplashScreenService] Download progress: ${progress}% (${downloadedBytes}/${totalBytes} bytes)`);
            } else {
              console.log(`[SplashScreenService] Downloaded ${downloadedBytes} bytes...`);
            }
          });
          
          response.on('end', () => {
            console.log(`[SplashScreenService] Response stream ended. Total downloaded: ${downloadedBytes} bytes`);
          });
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`[SplashScreenService] Download completed successfully. Total bytes: ${downloadedBytes}`);
            resolve(true);
          });
          
          file.on('error', (error) => {
            console.error(`[SplashScreenService] File write error:`, error);
            file.close();
            resolve(false);
          });
        } else {
          console.error(`[SplashScreenService] Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`);
          file.close();
          resolve(false);
        }
      });
      
      request.on('error', (error) => {
        console.error(`[SplashScreenService] Request error downloading ${url}:`, error);
        file.close();
        resolve(false);
      });
      
      request.setTimeout(30000, () => {
        console.error(`[SplashScreenService] Download timeout for ${url}`);
        request.destroy();
        file.close();
        resolve(false);
      });
    });
  }

  /**
   * Get local file path for a splash screen
   */
  private getLocalPath(splashScreen: SplashScreenData): string {
    const fileName = `${splashScreen.FS_ID}_${splashScreen.FS_NOMBRE}.${splashScreen.FS_FORMATO}`;
    return path.join(this.splashDir, fileName);
  }

  /**
   * Check if local file exists and is not older than 1 hour
   */
  private isLocalFileValid(localPath: string): boolean {
    if (!fs.existsSync(localPath)) {
      return false;
    }
    
    const stats = fs.statSync(localPath);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return stats.mtime.getTime() > oneHourAgo;
  }

  /**
   * Get the last sync date from file system
   */
  private getLastSyncDate(): Date | null {
    try {
      const syncFile = path.join(this.splashDir, 'last-sync.txt');
      if (fs.existsSync(syncFile)) {
        const lastSyncStr = fs.readFileSync(syncFile, 'utf8').trim();
        return new Date(lastSyncStr);
      }
    } catch (error) {
      console.error('[SplashScreenService] Error getting last sync date:', error);
    }
    return null;
  }

  /**
   * Save the last sync date to file system
   */
  private saveLastSyncDate(date: Date): void {
    try {
      const syncFile = path.join(this.splashDir, 'last-sync.txt');
      fs.writeFileSync(syncFile, date.toISOString());
      console.log('[SplashScreenService] Saved last sync date:', date.toISOString());
    } catch (error) {
      console.error('[SplashScreenService] Error saving last sync date:', error);
    }
  }

  /**
   * Get active splash screens with incremental sync
   */
  public async getActiveSplashScreensIncremental(
    machineCode: string = '001',
    sede: string = '001',
    local: string = '001'
  ): Promise<SplashScreenContent[]> {
    console.log('[SplashScreenService] Starting incremental sync for machine:', machineCode);
    
    // Get last sync date
    const lastSyncDate = this.getLastSyncDate();
    console.log('[SplashScreenService] Last sync date:', lastSyncDate);
    
    // Get only new splash screens since last sync
    const splashScreens = await getNewSplashScreens(machineCode, sede, local, lastSyncDate || undefined);
    
    if (splashScreens.length === 0) {
      console.log('[SplashScreenService] No new splash screens found, using cached content');
      // Return cached content if available
      return this.getCachedSplashContent();
    }

    console.log(`[SplashScreenService] Found ${splashScreens.length} new splash screens to download`);
    
    // Process new splash screens
    const splashContents = await this.processSplashScreens(splashScreens);
    
    // Update last sync date with the latest creation date
    if (splashScreens.length > 0) {
      const latestDate = new Date(Math.max(...splashScreens.map(s => new Date(s.FD_FEC_CRE).getTime())));
      this.saveLastSyncDate(latestDate);
    }
    
    return splashContents;
  }

  /**
   * Get cached splash content from existing files
   */
  private getCachedSplashContent(): SplashScreenContent[] {
    try {
      const splashDir = path.join(app.getPath('userData'), 'splash-screens');
      if (!fs.existsSync(splashDir)) {
        return [];
      }

      const files = fs.readdirSync(splashDir);
      const splashContents: SplashScreenContent[] = [];

      files.forEach((file, index) => {
        const filePath = path.join(splashDir, file);
        const ext = path.extname(file).toLowerCase();
        
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
          splashContents.push({
            type: 'image',
            src: filePath,
            name: path.basename(file, ext),
            order: index
          });
        } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
          splashContents.push({
            type: 'video',
            src: filePath,
            name: path.basename(file, ext),
            order: index
          });
        }
      });

      splashContents.sort((a, b) => a.order - b.order);
      console.log(`[SplashScreenService] Loaded ${splashContents.length} cached splash screens`);
      
      return splashContents;
    } catch (error) {
      console.error('[SplashScreenService] Error loading cached splash content:', error);
      return [];
    }
  }

  /**
   * Process splash screens and download if needed
   */
  private async processSplashScreens(splashScreens: SplashScreenData[]): Promise<SplashScreenContent[]> {
    const splashContents: SplashScreenContent[] = [];
    const downloadPromises: Promise<void>[] = [];

    for (const splashScreen of splashScreens) {
      console.log(`[SplashScreenService] Processing splash screen: ${splashScreen.FS_NOMBRE}`);
      const localPath = this.getLocalPath(splashScreen);
      const remoteUrl = splashScreen.FS_RUTA.startsWith('http') ? splashScreen.FS_RUTA : `${this.repositoryBaseUrl}${splashScreen.FS_RUTA}`;
      
      console.log(`[SplashScreenService] Local path: ${localPath}`);
      console.log(`[SplashScreenService] Remote URL: ${remoteUrl}`);

      // Check if we need to download the file
      if (!this.isLocalFileValid(localPath)) {
        console.log(`[SplashScreenService] Queueing download for ${splashScreen.FS_NOMBRE} from ${remoteUrl}...`);
        
        const downloadPromise = this.downloadFile(remoteUrl, localPath).then((downloaded) => {
          if (!downloaded) {
            console.error(`[SplashScreenService] Failed to download ${splashScreen.FS_NOMBRE}`);
            throw new Error(`Failed to download ${splashScreen.FS_NOMBRE}`);
          } else {
            console.log(`[SplashScreenService] Successfully downloaded ${splashScreen.FS_NOMBRE}`);
          }
        });
        
        downloadPromises.push(downloadPromise);
      } else {
        console.log(`[SplashScreenService] Using cached file for ${splashScreen.FS_NOMBRE}`);
      }

      splashContents.push({
        type: splashScreen.FS_TIPO,
        src: localPath,
        name: splashScreen.FS_NOMBRE,
        order: splashScreen.FS_ORDEN
      });
    }

    // Wait for all downloads to complete
    if (downloadPromises.length > 0) {
      console.log(`[SplashScreenService] Waiting for ${downloadPromises.length} downloads to complete...`);
      await Promise.all(downloadPromises);
      console.log(`[SplashScreenService] All downloads completed`);
    }

    // Sort by order
    splashContents.sort((a, b) => a.order - b.order);
    return splashContents;
  }

  /**
   * Get active splash screens and download if needed (legacy method)
   */
  public async getActiveSplashScreens(
    sede: string = '001',
    local: string = '001'
  ): Promise<SplashScreenContent[]> {
    console.log('[SplashScreenService] getActiveSplashScreens called with sede:', sede, 'local:', local);
    try {
      console.log('[SplashScreenService] Getting splash screens for machine: 000003, sede:', sede, 'local:', local);
      console.log('[SplashScreenService] Repository URL:', this.repositoryBaseUrl);
      console.log('[SplashScreenService] Splash directory:', this.splashDir);
      
      // Get splash screens from database
      const splashScreens = await getActiveSplashScreens(
        '000003', // Usar el código correcto de la BD
        sede,
        local
      );

      console.log('[SplashScreenService] Database returned:', splashScreens.length, 'splash screens');
      console.log('[SplashScreenService] Splash screens data:', splashScreens);

      if (splashScreens.length === 0) {
        console.log('[SplashScreenService] No active splash screens found, using defaults');
        return this.getDefaultSplashScreens();
      }

      const splashContents: SplashScreenContent[] = [];

      const downloadPromises: Promise<void>[] = [];
      for (const splashScreen of splashScreens) {
        console.log(`[SplashScreenService] Processing splash screen: ${splashScreen.FS_NOMBRE}`);
        const localPath = this.getLocalPath(splashScreen);
        const remoteUrl = splashScreen.FS_RUTA.startsWith('http') ? splashScreen.FS_RUTA : `${this.repositoryBaseUrl}${splashScreen.FS_RUTA}`;
        
        console.log(`[SplashScreenService] Local path: ${localPath}`);
        console.log(`[SplashScreenService] Remote URL: ${remoteUrl}`);

        // Check if we need to download the file
        if (!this.isLocalFileValid(localPath)) {
          console.log(`[SplashScreenService] Queueing download for ${splashScreen.FS_NOMBRE} from ${remoteUrl}...`);
          
          const downloadPromise = this.downloadFile(remoteUrl, localPath).then((downloaded) => {
            if (!downloaded) {
              console.error(`[SplashScreenService] Failed to download ${splashScreen.FS_NOMBRE}`);
              throw new Error(`Failed to download ${splashScreen.FS_NOMBRE}`);
            } else {
              console.log(`[SplashScreenService] Successfully downloaded ${splashScreen.FS_NOMBRE}`);
            }
          });
          
          downloadPromises.push(downloadPromise);
        } else {
          console.log(`[SplashScreenService] Using cached file for ${splashScreen.FS_NOMBRE}`);
        }

        splashContents.push({
          type: splashScreen.FS_TIPO,
          src: localPath,
          name: splashScreen.FS_NOMBRE,
          order: splashScreen.FS_ORDEN
        });
      }

      // Wait for all downloads to complete
      if (downloadPromises.length > 0) {
        console.log(`[SplashScreenService] Waiting for ${downloadPromises.length} downloads to complete...`);
        await Promise.all(downloadPromises);
        console.log(`[SplashScreenService] All downloads completed`);
      }

      // Sort by order
      splashContents.sort((a, b) => a.order - b.order);

      console.log(`[SplashScreenService] Loaded ${splashContents.length} splash screens`);
      return splashContents;

    } catch (error) {
      console.error('[SplashScreenService] Error getting splash screens:', error);
      return this.getDefaultSplashScreens();
    }
  }

  /**
   * Get default splash screens as fallback
   */
  private getDefaultSplashScreens(): SplashScreenContent[] {
    return [
      {
        type: 'image',
        src: path.join(__dirname, '../../renderer/assets/images/splash/splashScreen_1.png'),
        name: 'Default Splash 1',
        order: 1
      },
      {
        type: 'image',
        src: path.join(__dirname, '../../renderer/assets/images/splash/splashScreen_2.png'),
        name: 'Default Splash 2',
        order: 2
      },
      {
        type: 'image',
        src: path.join(__dirname, '../../renderer/assets/images/splash/splashScreen_3.png'),
        name: 'Default Splash 3',
        order: 3
      }
    ];
  }

  /**
   * Force refresh of splash screens
   */
  public async refreshSplashScreens(
    sede: string = '001',
    local: string = '001'
  ): Promise<SplashScreenContent[]> {
    // Clear local cache
    const files = fs.readdirSync(this.splashDir);
    for (const file of files) {
      fs.unlinkSync(path.join(this.splashDir, file));
    }

    return this.getActiveSplashScreens(sede, local);
  }
}

export const splashScreenService = SplashScreenService.getInstance(); 
