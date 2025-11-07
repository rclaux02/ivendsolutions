# Troubleshooting del Error ERR_NGROK_3200

## ¿Qué es el error ERR_NGROK_3200?

El error `ERR_NGROK_3200` es un código de error específico de ngrok que indica problemas de **autenticación o configuración del token**. Este error ocurre cuando:

1. **Token inválido o expirado**: El token de autenticación de ngrok no es válido
2. **Token no configurado**: Ngrok no puede encontrar o usar el token de autenticación
3. **Problemas de permisos**: El token no tiene los permisos necesarios para el dominio configurado
4. **Dominio ocupado**: El dominio personalizado está siendo usado por otra instancia

## ¿Por qué ocurrió en la app instalada pero no en desarrollo?

### En la App Instalada (Producción):
- **Token hardcodeado**: El token está hardcodeado en el código y puede estar expirado
- **Configuración de archivo**: En producción, ngrok usa un archivo de configuración que puede tener problemas de permisos
- **Ruta de ngrok**: En producción usa ngrok integrado en el ejecutable, que puede tener problemas de acceso
- **Sin pooling**: No tenía pooling de endpoints habilitado

### En Desarrollo:
- **Ngrok del sistema**: Usa ngrok instalado globalmente en tu sistema
- **Token configurado**: Tu ngrok local ya tiene el token configurado correctamente
- **Sin restricciones**: No hay problemas de permisos del ejecutable

## Soluciones Implementadas

### 1. **Pooling de Endpoints**
Ahora ngrok usa `--pooling-enabled=true` para mantener URLs consistentes:

```typescript
// En desarrollo
ngrokCmd = `"${ngrokPath}" http 8081 --domain=${this.DOMAIN} --pooling-enabled=true`;

// En producción
const config = `authtoken: ${this.NGROK_TOKEN}
version: "2"
tunnels:
  webhook:
    proto: http
    addr: 8081
    domain: ${this.DOMAIN}
    inspect: false
    bind_tls: true
    timeout: 30s`;
```

### 2. **Fallback sin Dominio Personalizado**
Si falla con dominio personalizado, automáticamente intenta sin dominio:

```typescript
// Si falla con dominio personalizado, intentar sin dominio
if (!ngrokStarted) {
  console.log('⚠️ Ngrok failed with custom domain, trying without domain...');
  ngrokStarted = await ngrokService.startNgrokWithoutDomain();
}
```

### 3. **Mejor Manejo de Errores**
Detección específica de errores y logging mejorado:

```typescript
if (error.includes('ERR_NGROK_3200')) {
  console.error('❌ Error 3200: Problema de autenticación o dominio');
  console.error('💡 Soluciones:');
  console.error('   1. Verificar que el token sea válido');
  console.error('   2. Verificar que el dominio esté disponible');
  console.error('   3. Intentar sin dominio personalizado');
}
```

### 4. **Configuración Mejorada**
- **Timeout aumentado**: 5 segundos para dar más tiempo al inicio
- **Buffer aumentado**: 1MB para mejor manejo de datos
- **Configuración de estabilidad**: `bind_tls: true` y `timeout: 30s`

## Scripts de Configuración

### Configurar Ngrok Correctamente
```bash
npm run setup:ngrok
```

Este script:
1. Verifica la instalación de ngrok
2. Configura el token de autenticación
3. Verifica la configuración
4. Prueba la configuración básica
5. Prueba la configuración con dominio personalizado

### Probar Configuración
```bash
npm run test:ngrok
```

Este script:
1. Verifica la instalación de ngrok
2. Verifica la configuración
3. Prueba inicio sin dominio personalizado
4. Prueba inicio con dominio personalizado
5. Proporciona un resumen de la configuración

## Cómo Funciona Ahora

### En Desarrollo:
```bash
npm start
```
- Usa ngrok del sistema con pooling habilitado
- Inicia ngrok externamente con `start-with-ngrok.js`
- Si falla con dominio, usa configuración sin dominio

### En Producción (Ejecutable):
```bash
npm run dist
```
- El ejecutable incluye ngrok integrado
- Se inicia automáticamente cuando se habilita el webhook
- Intenta con dominio personalizado primero
- Si falla, usa configuración sin dominio
- Se detiene automáticamente cuando se cierra la aplicación

## Ventajas de las Mejoras

1. **URLs Consistentes**: Pooling mantiene la misma URL entre reinicios
2. **Fallback Automático**: Si falla con dominio, usa configuración sin dominio
3. **Mejor Logging**: Detección específica de errores y soluciones
4. **Configuración Robusta**: Timeouts y buffers optimizados
5. **Scripts de Diagnóstico**: Herramientas para detectar y solucionar problemas

## Troubleshooting

### Error: "Ngrok no encontrado"
```bash
npm run setup:ngrok
```

### Error: "Token inválido"
1. Verificar el token en [ngrok.com](https://ngrok.com)
2. Actualizar el token en el código
3. Reconfigurar ngrok localmente

### Error: "Dominio ocupado"
1. Verificar si otra instancia está usando el dominio
2. Usar un dominio diferente
3. La aplicación automáticamente usará configuración sin dominio

### Error: "Puerto 8081 ocupado"
- Verificar que no haya otra instancia ejecutándose
- Cambiar el puerto en la configuración si es necesario

## Comandos Útiles

### Verificar Configuración de Ngrok
```bash
ngrok config check
```

### Verificar Token
```bash
ngrok config check
```

### Probar Ngrok Manualmente
```bash
# Sin dominio personalizado
ngrok http 8081 --pooling-enabled=true

# Con dominio personalizado
ngrok http 8081 --domain=ant-allowing-mildly.ngrok-free.app --pooling-enabled=true
```

### Verificar Tunnels Activos
```bash
curl http://localhost:4040/api/tunnels
```

## Notas Importantes

- **Pooling**: Mantiene URLs consistentes entre reinicios
- **Fallback**: Si falla con dominio, usa configuración sin dominio
- **Logging**: Mejor detección y reporte de errores
- **Timeout**: Aumentado para dar más tiempo al inicio
- **Configuración**: Optimizada para estabilidad

## Próximos Pasos

1. **Ejecutar configuración**: `npm run setup:ngrok`
2. **Probar configuración**: `npm run test:ngrok`
3. **Generar ejecutable**: `npm run dist`
4. **Probar aplicación**: Usar los scripts de inicio automático

Con estas mejoras, el error `ERR_NGROK_3200` debería resolverse y la aplicación debería funcionar correctamente tanto en desarrollo como en producción. 