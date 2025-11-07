// Script de prueba para simular errores de motor del Arduino
// Este script simula los mensajes de error que envía el Arduino

console.log('🚀 Iniciando prueba de captura de errores de motor del Arduino...');

// Simular mensajes de error del Arduino
const arduinoErrorMessages = [
  "Error: Se excedio el maximo de 10 motores.\r\n",
  "Error: Numero de motor invalido o fuera de rango.\r\n",
  "Error: Formato de lista de motores invalido.\r\n",
  "ERROR: 1\r\n",
  "Error: Motor no disponible.\r\n",
  "ERROR: 2\r\n"
];

console.log('📋 Mensajes de error que serán capturados:');
arduinoErrorMessages.forEach((msg, index) => {
  console.log(`${index + 1}. ${msg.trim()}`);
});

console.log('\n✅ Configuración completada!');
console.log('🔍 Los errores del Arduino ahora se mostrarán SOLO en:');
console.log('   - Console del main process (TERMINAL)');
console.log('   - NO se muestran en el renderer');
console.log('   - NO se muestran en la UI');
console.log('   - Solo logging local en el main process');

console.log('\n📝 Para probar:');
console.log('1. Ejecuta la aplicación');
console.log('2. Intenta dispensar un producto');
console.log('3. Si hay errores del Arduino, se mostrarán automáticamente');
console.log('4. Revisa SOLO la consola del terminal (main process)');
console.log('5. NO se mostrará nada en la UI ni en el navegador'); 