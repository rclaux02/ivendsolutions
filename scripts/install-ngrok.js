const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Instalando ngrok...');

// Verificar si ngrok ya está instalado
const checkNgrok = () => {
  return new Promise((resolve) => {
    exec('ngrok version', (error) => {
      resolve(!error);
    });
  });
};

// Instalar ngrok usando npm
const installNgrok = () => {
  return new Promise((resolve, reject) => {
    console.log('📦 Instalando ngrok via npm...');
    exec('npm install ngrok@5.0.0-beta.3', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error instalando ngrok:', error);
        reject(error);
        return;
      }
      console.log('✅ Ngrok instalado correctamente');
      resolve();
    });
  });
};

// Función principal
const main = async () => {
  try {
    const isNgrokInstalled = await checkNgrok();
    
    if (isNgrokInstalled) {
      console.log('✅ Ngrok ya está instalado en el sistema');
      return;
    }
    
    console.log('📥 Ngrok no encontrado, instalando...');
    await installNgrok();
    
    console.log('🎉 Instalación completada!');
    console.log('💡 Ahora puedes ejecutar: npm run dist');
    
  } catch (error) {
    console.error('❌ Error durante la instalación:', error);
    process.exit(1);
  }
};

main(); 