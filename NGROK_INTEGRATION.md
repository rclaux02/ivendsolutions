# Integración de Ngrok en el Ejecutable

## Resumen

Ahora el ejecutable generado con `npm run dist` **SÍ incluye ngrok** integrado. Esto significa que cuando ejecutes la aplicación, ngrok se iniciará automáticamente si el webhook está habilitado.

## Cambios Realizados

### 1. Dependencias
- ✅ Agregado `ngrok@5.0.0-beta.3` como dependencia
- ✅ Configurado `extraResources` en electron-builder para incluir ngrok en el ejecutable

### 2. Servicio de Ngrok
- ✅ Creado `src/main/ngrokService.ts` que maneja la integración de ngrok
- ✅ Integrado en `src/main/main.ts` para iniciar/detener automáticamente

### 3. Scripts
- ✅ Agregado `npm run install:ngrok` para instalar ngrok
- ✅ Script de instalación automática en `scripts/install-ngrok.js`

## Cómo Funciona

### En Desarrollo
```bash
npm start
```
- Usa ngrok del sistema (si está instalado)
- Inicia ngrok externamente con `start-with-ngrok.js`

### En Producción (Ejecutable)
```bash
npm run dist
```
- El ejecutable incluye ngrok integrado
- Se inicia automáticamente cuando se habilita el webhook
- Se detiene automáticamente cuando se cierra la aplicación

## Instalación

### Opción 1: Instalación Automática
```bash
npm run install:ngrok
```

### Opción 2: Instalación Manual
```bash
npm install ngrok@5.0.0-beta.3
```

## Uso

### Instalación y Configuración Completa
```bash
# Script completo que instala ngrok, genera ejecutable y prueba
npm run setup:complete
```

### Generar Ejecutable con Ngrok
```bash
npm run dist
```

### Ejecutar con Webhook (incluye ngrok)
```bash
# En desarrollo
npm start

# En producción (opción 1 - manual)
./release/Vape Vending Machine-Setup.exe --enable-webhook

# En producción (opción 2 - script automático)
# Usar el script: scripts/start-with-webhook.ps1
```

### Scripts de Inicio Automático

**Windows (PowerShell):**
```powershell
.\scripts\start-with-webhook.ps1
```

**Windows (CMD):**
```cmd
scripts\start-with-webhook.bat
```

### Probar Webhook
```bash
# Probar si el webhook está funcionando
npm run test:webhook
```

## Configuración

### Dominio de Ngrok
El dominio está configurado en `src/main/ngrokService.ts`:
```typescript
const ngrokCmd = `"${ngrokPath}" http 8081 --domain=ant-allowing-mildly.ngrok-free.app`;
```

### Puerto del Webhook
El webhook se ejecuta en el puerto `8081` y ngrok lo expone públicamente.

## Estructura del Ejecutable

```
release/
└── Vape Vending Machine-Setup.exe
    ├── assets/           # Recursos de la aplicación
    ├── ngrok/           # Ngrok integrado
    │   └── ngrok.exe    # Ejecutable de ngrok
    └── scripts/         # Scripts de Regula
```

## Ventajas

1. **Automatización**: Ngrok se inicia/detiene automáticamente
2. **Portabilidad**: No requiere instalación externa de ngrok
3. **Confiabilidad**: Manejo de errores y limpieza automática
4. **Flexibilidad**: Funciona en desarrollo y producción

## Troubleshooting

### Error: "Ngrok no encontrado"
```bash
npm run install:ngrok
```

### Error: "Puerto 8081 ocupado"
- Verifica que no haya otra instancia ejecutándose
- Cambia el puerto en la configuración si es necesario

### Error: "Webhook no se inicia"
**Causa:** La aplicación no se ejecuta con la bandera `--enable-webhook`

**Soluciones:**
1. **Usar el script automático:**
   ```powershell
   .\scripts\start-with-webhook.ps1
   ```

2. **Ejecutar manualmente con bandera:**
   ```cmd
   "C:\Program Files\Vape Vending Machine\Vape Vending Machine.exe" --enable-webhook
   ```

3. **Verificar que el webhook esté funcionando:**
   ```bash
   curl -X POST http://localhost:8081/webhook/order-created
   ```

### Error: "Dominio no disponible"
- Verifica que el dominio esté configurado correctamente
- Considera usar un dominio personalizado de ngrok

## Notas Importantes

- El ejecutable incluye ngrok para Windows (x64)
- Para otras plataformas, se requiere ngrok instalado en el sistema
- El webhook solo se inicia con la bandera `--enable-webhook`
- Ngrok se detiene automáticamente al cerrar la aplicación 