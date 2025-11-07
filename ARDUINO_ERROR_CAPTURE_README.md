# 🚨 Sistema de Captura de Errores del Arduino (Solo Console Log)

## 📋 Descripción

Este sistema captura automáticamente todos los mensajes de error que envía el Arduino a través del puerto serial y los registra únicamente en la consola del main process y renderer process. **NO se muestra nada en la interfaz de usuario.**

## 🔧 Componentes Implementados

### 1. **Arduino Controller** (`src/main/hardware/arduino.ts`)
- **Función**: `setupEventListeners()`
- **Responsabilidad**: Escucha datos del puerto serial y detecta mensajes de error
- **Eventos capturados**:
  - `Error: Se excedio el maximo de 10 motores`
  - `Error: Numero de motor invalido o fuera de rango`
  - `Error: Formato de lista de motores invalido`
  - `ERROR: %d` (errores generales con código numérico)
  - Cualquier mensaje que contenga "Error:" o "ERROR:"

### 2. **Hardware Service** (`src/main/hardware/hardwareService.ts`)
- **Función**: `setupEventListeners()`
- **Responsabilidad**: Escucha eventos de error del Arduino y los reenvía
- **Eventos emitidos**:
  - `HardwareEvent.MOTOR_ERROR`
  - `HardwareEvent.ERROR`

### 3. **Hardware IPC** (`src/main/ipc/hardwareIPC.ts`)
- **Función**: `registerHardwareIPC()`
- **Responsabilidad**: Solo maneja eventos de error general para logging
- **Canales IPC**:
  - `hardware:error` (solo para logging)





## 🚀 Flujo de Captura de Errores

```
Arduino → Serial Port → Arduino Controller → Hardware Service → Console Log
   ↓           ↓              ↓                    ↓
Error    USB_Print()    setupEventListeners   Console Only
```

### Paso a Paso:

1. **Arduino detecta error** y envía mensaje via `USB_Print()`
2. **Arduino Controller** recibe datos del puerto serial
3. **setupEventListeners** detecta patrones de error y emite evento `motorError`
4. **Hardware Service** escucha evento y registra en consola
5. **Console Log** muestra error con timestamp y detalles

## 📱 Tipos de Errores Capturados

### Errores Específicos:
- **`MOTOR_LIMIT_EXCEEDED`**: Máximo de 10 motores excedido
- **`INVALID_MOTOR_NUMBER`**: Número de motor inválido o fuera de rango
- **`INVALID_MOTOR_LIST_FORMAT`**: Formato de lista de motores inválido
- **`GENERAL_OPERATION_ERROR`**: Error general de operación con código numérico
- **`UNKNOWN_ERROR`**: Cualquier otro mensaje de error no categorizado

### Formato de Mensajes:
```typescript
interface MotorError {
  type: string;           // Tipo de error
  message: string;        // Mensaje completo del Arduino
  timestamp: number;      // Timestamp del error
  component: string;      // Componente que generó el error
}
```

## 🔍 Logs y Debug

### Console del Main Process:
```
[ARDUINO ERROR] 🚨 MOTOR LIMIT EXCEEDED: Maximum of 10 motors exceeded
[HARDWARE] 🚨 MOTOR ERROR from Arduino: { type: 'MOTOR_LIMIT_EXCEEDED', message: '...' }
```

**Nota**: Los errores solo se muestran en la consola del main process. No se envían al renderer ni se muestran en la UI.

## 🧪 Cómo Probar

### 1. **Ejecutar la Aplicación**
```bash
npm run dev
# o
npm start
```

### 2. **Simular Error del Arduino**
- Intenta dispensar un producto
- Si hay errores de hardware, se mostrarán automáticamente

### 3. **Verificar Captura**
- **Terminal**: Revisar logs del main process
- **Navegador**: No hay logs en el renderer
- **UI**: No se muestra nada en la interfaz

### 4. **Mensajes de Prueba**
Los siguientes mensajes del Arduino serán capturados automáticamente:
```
Error: Se excedio el maximo de 10 motores.
Error: Numero de motor invalido o fuera de rango.
Error: Formato de lista de motores invalido.
ERROR: 1
```

## 🛠️ Personalización

### Agregar Nuevos Tipos de Error:
1. **Arduino Controller**: Agregar patrón en `setupEventListeners()`
2. **Hardware Service**: Agregar manejo específico si es necesario
3. **Hook**: Agregar caso en el switch de tipos de error

### Modificar Formato de Logs:
1. **Arduino Controller**: Cambiar formato de `console.error()`
2. **Hardware Service**: Modificar estructura del evento
3. **Hook**: Personalizar formato de logs en el frontend

## 📚 Archivos Relacionados

- `src/main/hardware/arduino.ts` - Controlador Arduino y captura de errores
- `src/main/hardware/hardwareService.ts` - Servicio de hardware (solo logging)
- `src/main/ipc/hardwareIPC.ts` - Comunicación IPC (solo para logging general)
- `src/renderer/screens/ProductSelection/index.tsx` - Pantalla principal (sin integración de errores)

## ✅ Estado Actual

- ✅ Captura automática de errores del Arduino
- ✅ Logs detallados en main process (SOLO AQUÍ)
- ❌ NO se muestran en el renderer
- ❌ NO se muestran en la UI
- ✅ Manejo de múltiples tipos de error
- ✅ Timestamps en logs
- ✅ Solo logging local en main process
- ❌ NO hay comunicación IPC de errores al renderer

## 🚀 Próximas Mejoras

- [ ] Notificaciones push para errores críticos
- [ ] Historial persistente de errores
- [ ] Filtros por tipo de error
- [ ] Exportación de logs de error
- [ ] Integración con sistema de monitoreo
- [ ] Alertas automáticas por email/SMS 