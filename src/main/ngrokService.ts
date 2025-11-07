import { exec } from 'child_process';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class NgrokService {
  private ngrokProcess: any = null;
  private isRunning = false;
  private readonly NGROK_TOKEN = '2y39xrJYCXyIj4k78RFtk3Wfyhj_34atH9rQbekS8WzW5piyV';
  private readonly DOMAIN = 'ant-allowing-mildly.ngrok-free.app';

  constructor() {
    // Asegurar que ngrok se detenga cuando la app se cierre
    app.on('before-quit', () => {
      this.stopNgrok();
    });
  }

  /**
   * Configura el token de ngrok para producción
   */
  private async configureNgrokToken(): Promise<void> {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      try {
        // En producción, configurar el token en el directorio temporal
        const ngrokPath = this.getNgrokPath();
        const ngrokDir = path.dirname(ngrokPath);
        const configPath = path.join(ngrokDir, 'ngrok.yml');
        
        // Crear configuración de ngrok con el token y pooling habilitado
        const config = `authtoken: ${this.NGROK_TOKEN}
version: "2"
tunnels:
  webhook:
    proto: http
    addr: 8081
    domain: ${this.DOMAIN}
    # Habilitar pooling para mantener URL consistente
    inspect: false
    # Configuración adicional para estabilidad
    bind_tls: true
    # Timeout más largo para conexiones
    timeout: 30s`;

        // Escribir archivo de configuración
        fs.writeFileSync(configPath, config);
        console.log('✅ Token de ngrok configurado para producción');
      } catch (error) {
        console.error('❌ Error configurando token de ngrok:', error);
      }
    }
  }

  /**
   * Inicia ngrok con el dominio configurado y pooling habilitado
   */
  async startNgrok(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Ngrok ya está ejecutándose');
      return true;
    }

    return new Promise(async (resolve) => {
      try {
        // Configurar token en producción
        await this.configureNgrokToken();
        
        // Determinar la ruta de ngrok según la plataforma
        const ngrokPath = this.getNgrokPath();
        const isDev = process.env.NODE_ENV === 'development';
        
        let ngrokCmd: string;
        if (isDev) {
          // En desarrollo, usar comando directo con pooling habilitado
          ngrokCmd = `"${ngrokPath}" http 8081 --domain=${this.DOMAIN} --pooling-enabled=true`;
        } else {
          // En producción, usar archivo de configuración
          const ngrokDir = path.dirname(ngrokPath);
          const configPath = path.join(ngrokDir, 'ngrok.yml');
          ngrokCmd = `"${ngrokPath}" start --config="${configPath}" webhook`;
        }
        
        console.log('🚀 Iniciando ngrok...');
        console.log('📡 Comando:', ngrokCmd);
        console.log('🔗 Dominio configurado:', this.DOMAIN);
        console.log('🔄 Pooling habilitado para URL consistente');

        this.ngrokProcess = exec(ngrokCmd, {
          // Opciones adicionales para mejor estabilidad
          maxBuffer: 1024 * 1024, // 1MB buffer
          timeout: 30000 // 30 segundos timeout
        });

        this.ngrokProcess.on('error', (error: any) => {
          console.error('❌ Error iniciando ngrok:', error.message);
          console.error('🔍 Detalles del error:', error);
          this.isRunning = false;
          resolve(false);
        });

        // Capturar salida para debugging
        this.ngrokProcess.stdout?.on('data', (data: string) => {
          const output = data.trim();
          console.log('📡 Ngrok output:', output);
          
          // Detectar si ngrok se inició correctamente
          if (output.includes('started tunnel') || output.includes('url=')) {
            console.log('✅ Ngrok tunnel iniciado correctamente');
          }
        });

        this.ngrokProcess.stderr?.on('data', (data: string) => {
          const error = data.trim();
          console.log('📡 Ngrok stderr:', error);
          
          // Detectar errores específicos
          if (error.includes('ERR_NGROK_3200')) {
            console.error('❌ Error 3200: Problema de autenticación o dominio');
            console.error('💡 Soluciones:');
            console.error('   1. Verificar que el token sea válido');
            console.error('   2. Verificar que el dominio esté disponible');
            console.error('   3. Intentar sin dominio personalizado');
          } else if (error.includes('domain')) {
            console.error('❌ Error de dominio: El dominio puede estar ocupado');
            console.error('💡 Considera usar un dominio diferente o sin dominio personalizado');
          }
        });

        // Esperar un momento para que ngrok se inicie
        setTimeout(() => {
          this.isRunning = true;
          console.log('✅ Ngrok iniciado correctamente');
          console.log('🌐 URL del webhook: https://' + this.DOMAIN + '/webhook/order-created');
          console.log('🔄 Pooling habilitado - URL se mantendrá consistente');
          resolve(true);
        }, 5000); // Aumentado a 5 segundos para dar más tiempo

      } catch (error) {
        console.error('❌ Error configurando ngrok:', error);
        this.isRunning = false;
        resolve(false);
      }
    });
  }

  /**
   * Inicia ngrok sin dominio personalizado (fallback)
   */
  async startNgrokWithoutDomain(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Ngrok ya está ejecutándose');
      return true;
    }

    return new Promise(async (resolve) => {
      try {
        const ngrokPath = this.getNgrokPath();
        const isDev = process.env.NODE_ENV === 'development';
        
        let ngrokCmd: string;
        if (isDev) {
          // Sin dominio personalizado, solo con pooling
          ngrokCmd = `"${ngrokPath}" http 8081 --pooling-enabled=true`;
        } else {
          // En producción, crear configuración sin dominio
          const ngrokPath = this.getNgrokPath();
          const ngrokDir = path.dirname(ngrokPath);
          const configPath = path.join(ngrokDir, 'ngrok.yml');
          
          const config = `authtoken: ${this.NGROK_TOKEN}
version: "2"
tunnels:
  webhook:
    proto: http
    addr: 8081
    inspect: false
    bind_tls: true
    timeout: 30s`;

          fs.writeFileSync(configPath, config);
          ngrokCmd = `"${ngrokPath}" start --config="${configPath}" webhook`;
        }
        
        console.log('🚀 Iniciando ngrok sin dominio personalizado...');
        console.log('📡 Comando:', ngrokCmd);

        this.ngrokProcess = exec(ngrokCmd, {
          maxBuffer: 1024 * 1024,
          timeout: 30000
        });

        this.ngrokProcess.on('error', (error: any) => {
          console.error('❌ Error iniciando ngrok (sin dominio):', error.message);
          this.isRunning = false;
          resolve(false);
        });

        this.ngrokProcess.stdout?.on('data', (data: string) => {
          const output = data.trim();
          console.log('📡 Ngrok output:', output);
          
          // Extraer URL del output
          if (output.includes('url=')) {
            const urlMatch = output.match(/url=([^\s]+)/);
            if (urlMatch) {
              console.log('🌐 URL del webhook:', urlMatch[1] + '/webhook/order-created');
            }
          }
        });

        this.ngrokProcess.stderr?.on('data', (data: string) => {
          console.log('📡 Ngrok stderr:', data.trim());
        });

        setTimeout(() => {
          this.isRunning = true;
          console.log('✅ Ngrok iniciado sin dominio personalizado');
          console.log('🔄 Pooling habilitado - URL se mantendrá consistente');
          resolve(true);
        }, 5000);

      } catch (error) {
        console.error('❌ Error configurando ngrok (sin dominio):', error);
        this.isRunning = false;
        resolve(false);
      }
    });
  }

  /**
   * Detiene ngrok si está ejecutándose
   */
  stopNgrok(): void {
    if (this.ngrokProcess && this.isRunning) {
      try {
        console.log('📡 Deteniendo ngrok...');
        process.kill(-this.ngrokProcess.pid, 'SIGTERM');
        this.isRunning = false;
        console.log('✅ Ngrok detenido');
      } catch (error) {
        console.log('📡 Ngrok ya estaba cerrado o no se pudo detener');
      }
    }
  }

  /**
   * Obtiene la ruta correcta de ngrok según la plataforma
   */
  private getNgrokPath(): string {
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // En desarrollo, usar ngrok del sistema
      return 'ngrok';
    } else {
      // En producción, usar ngrok incluido en el ejecutable
      const platform = process.platform;
      const arch = process.arch;
      
      let ngrokFileName = 'ngrok';
      if (platform === 'win32') {
        ngrokFileName = 'ngrok.exe';
      }
      
      const resourcesPath = process.resourcesPath;
      return path.join(resourcesPath, 'ngrok', ngrokFileName);
    }
  }

  /**
   * Verifica si ngrok está ejecutándose
   */
  isNgrokRunning(): boolean {
    return this.isRunning;
  }
}

// Instancia singleton
export const ngrokService = new NgrokService(); 