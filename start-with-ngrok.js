const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando aplicación con webhook y ngrok...');

// Inicia ngrok en background con pooling habilitado
const ngrokCmd = 'ngrok http 8081 --domain=ant-allowing-mildly.ngrok-free.app --pooling-enabled=true';
console.log('📡 Iniciando ngrok con dominio: ant-allowing-mildly.ngrok-free.app');
console.log('🔄 Pooling habilitado para URL consistente');

const ngrokProcess = exec(ngrokCmd, { 
  detached: true, 
  stdio: 'ignore',
  windowsHide: true 
});

ngrokProcess.on('error', (error) => {
  console.error('❌ Error iniciando ngrok:', error.message);
  console.log('💡 Asegúrate de que ngrok esté instalado y configurado correctamente');
});

// Espera un momento para que ngrok se inicie
setTimeout(() => {
  console.log('✅ Ngrok iniciado en background');
  console.log('🌐 URL del webhook: https://ant-allowing-mildly.ngrok-free.app/webhook/order-created');
  
  // Inicia la app Electron con webhook
  const electronCmd = process.platform === 'win32'
    ? 'cross-env NODE_ENV=production electron . --enable-webhook'
    : 'NODE_ENV=production electron . --enable-webhook';

  console.log('🖥️ Iniciando aplicación Electron...');
  
  const electronProcess = exec(electronCmd, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  electronProcess.stdout && electronProcess.stdout.pipe(process.stdout);
  electronProcess.stderr && electronProcess.stderr.pipe(process.stderr);

  electronProcess.on('close', (code) => {
    console.log(`🔄 Aplicación Electron cerrada con código ${code}`);
    // Mata ngrok cuando Electron termine
    try { 
      process.kill(-ngrokProcess.pid, 'SIGTERM');
      console.log('📡 Ngrok terminado');
    } catch (error) {
      console.log('📡 Ngrok ya estaba cerrado');
    }
    process.exit(code);
  });

  electronProcess.on('error', (error) => {
    console.error('❌ Error iniciando Electron:', error.message);
    process.exit(1);
  });

}, 2000); // Espera 2 segundos para que ngrok se inicie

// Manejo de señales para cerrar todo limpiamente
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando aplicación...');
  try { 
    process.kill(-ngrokProcess.pid, 'SIGTERM');
  } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando aplicación...');
  try { 
    process.kill(-ngrokProcess.pid, 'SIGTERM');
  } catch {}
  process.exit(0);
}); 