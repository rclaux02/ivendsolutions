# 🚬 Máquina Expendedora de Vapes - Aplicación Electron

> Una aplicación moderna e inteligente para máquinas expendedoras construida con Electron, React y TypeScript que gestiona el dispensado de productos de vapeo con verificación avanzada de edad, procesamiento de pagos e integración de hardware.

## 📋 Tabla de Contenidos
- [Descripción General](#descripción-general)
- [Características](#características)
- [Stack Tecnológico](#stack-tecnológico)
- [Prerrequisitos](#prerrequisitos)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [Configuración](#configuración)
- [Integración de Hardware](#integración-de-hardware)
- [Despliegue](#despliegue)
- [Solución de Problemas](#solución-de-problemas)
- [Contribuir](#contribuir)

## 🎯 Descripción General

Esta aplicación basada en Electron alimenta una máquina expendedora inteligente de vapes con características completas que incluyen:
- **Interfaz de Usuario Táctil** para selección de productos
- **Verificación Avanzada de Edad** usando reconocimiento facial y escaneo de ID
- **Procesamiento Seguro de Pagos** vía integración con Izipay
- **Control de Hardware** para dispensado de productos vía Arduino
- **Gestión de Inventario en Tiempo Real**
- **Actualizaciones Automáticas** para mantenimiento remoto

## ✨ Características

### 🔐 Verificación de Edad
- **Reconocimiento Facial** usando Human
- **Escaneo de Documentos de Identidad** con Regula Document Reader

### 💳 Integración de Pagos
- **Pasarela de Pagos Izipay** para transacciones seguras
- **Soporte para Múltiples Métodos de Pago**
- **Registro de Transacciones**

### 🤖 Integración de Hardware
- **Comunicación con Arduino** vía Puerto Serie
- **CH340 USB-a-Serie** - Puente de comunicación con microcontrolador
- **SDK de Izipay** - Integración de pasarela de pagos
- **SDKs de Regula** - Verificación de documentos y rostros

### 🎨 Interfaz de Usuario
- **UI Moderna con React** y Tailwind CSS
- **Interfaz Optimizada para Táctil** para uso en kioscos
- **Características de Accesibilidad** para diseño inclusivo

### 🔄 Gestión del Sistema
- **Gestión de Base de Datos** para productos y transacciones

## 🛠 Stack Tecnológico

### Frontend (Proceso Renderer)
- **React 18** - Framework de UI
- **TypeScript** - JavaScript con tipos seguros
- **Tailwind CSS** - Framework CSS utility-first
- **Vite** - Herramienta de construcción rápida y servidor de desarrollo
- **Lucide React** - Librería de iconos

### Backend (Proceso Main)
- **Node.js** - Entorno de ejecución
- **Electron** - Framework para aplicaciones de escritorio
- **Express** - Framework de servidor HTTP
- **TypeScript** - JavaScript con tipos seguros

### Base de Datos y Almacenamiento
- **MySQL2** - Driver de base de datos
- **Electron Store** - Almacenamiento persistente

### Hardware e Integración
- **SerialPort** - Comunicación con Arduino
- **CH340 USB-a-Serie** - Puente de comunicación con microcontrolador
- **SDK de Izipay** - Integración de pasarela de pagos
- **SDKs de Regula** - Verificación de documentos y rostros

### Herramientas de Desarrollo
- **Jest** - Framework de pruebas
- **ESLint** - Análisis de código
- **Electron Builder** - Empaquetado de aplicaciones
- **Concurrently** - Ejecutar múltiples comandos

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener lo siguiente instalado:

### Software Requerido
- **Node.js** (v18.0.0 o superior) - [Descargar aquí](https://nodejs.org/)
- **npm** o **yarn** gestor de paquetes
- **Git** para control de versiones
- **Python** (v3.8+) para dependencias nativas
- **Visual Studio Build Tools** (Windows) o **Xcode** (macOS)

### Requisitos de Hardware
- **Windows 10/11** (plataforma objetivo principal)
- **4GB RAM mínimo** (8GB recomendado)
- **Puertos USB** para comunicación con Arduino
- **Cámara/Webcam** para verificación de edad
- **Pantalla táctil** (opcional, se soporta mouse/teclado)

### Opcional pero Recomendado
- **Arduino IDE** para desarrollo de hardware
- **MySQL Workbench** para gestión de base de datos
- **Postman** para pruebas de API

## 🚀 Instalación

### 1. Clonar el Repositorio
```bash
git clone https://github.com/your-username/vape-vending-machine.git
cd vape-vending-machine
```

### 2. Instalar Dependencias
```bash
# Usando npm
npm install

# Usando yarn
yarn install
```

### 3. Configuración del Entorno

ATENCIÓN! Actualmente no se está usando .env, sino variables en diferentes archivos como dbConfig.ts

Crear un archivo `.env` en el directorio raíz:
```env
# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=vending_machine

# Pasarela de Pagos
IZIPAY_API_KEY=tu_api_key_izipay
IZIPAY_SECRET_KEY=tu_secret_key_izipay

# Verificación de Edad
REGULA_API_KEY=tu_api_key_regula
REGULA_SECRET_KEY=tu_secret_key_regula

# Hardware
ARDUINO_PORT=COM3
ARDUINO_BAUD_RATE=9600

# Desarrollo
NODE_ENV=development
ELECTRON_ENABLE_LOGGING=1
```

### 4. Configuración de Base de Datos
```bash
# Crear base de datos y tablas
# (Ejecutar aquí tus scripts de migración SQL)
```

## 🛠 Desarrollo

### Iniciar Servidor de Desarrollo
```bash
# Iniciar el entorno de desarrollo
npm run electron-dev

# Iniciar silenciosamente (sin logs de consola)
npm run electron-dev:quiet

# Iniciar solo el proceso renderer (para desarrollo de UI)
npm run dev
```

### Flujo de Trabajo de Desarrollo
1. **Desarrollo Frontend**: Modificar archivos en `src/renderer/`
2. **Desarrollo Backend**: Modificar archivos en `src/main/`
3. **Recarga en Caliente**: Los cambios se reflejan automáticamente
4. **Depuración**: Usar Chrome DevTools para renderer, depurador Node para main

### Calidad de Código
```bash
# Ejecutar linting
npm run lint

# Ejecutar pruebas
npm run test

# Verificación de tipos
npx tsc --noEmit
```

## 📁 Estructura del Proyecto

```
vape-vending-machine/
├── 📁 src/
│   ├── 📁 main/                    # Proceso Main de Electron
│   │   ├── 📁 ageVerification/     # Lógica de verificación de edad
│   │   ├── 📁 database/            # Conexiones y consultas de BD
│   │   ├── 📁 hardware/            # Comunicación con Arduino
│   │   ├── 📁 ipc/                 # Comunicación entre procesos
│   │   ├── 📁 payment/             # Procesamiento de pagos
│   │   ├── 📁 services/            # Servicios de lógica de negocio
│   │   ├── 📁 utils/               # Funciones utilitarias
│   │   ├── 📄 main.ts              # Punto de entrada principal
│   │   └── 📄 preload.ts           # Puente de contexto
│   │
│   ├── 📁 renderer/                # Frontend React
│   │   ├── 📁 ageVerification/     # UI de verificación de edad
│   │   ├── 📁 assets/              # Imágenes, videos, fuentes
│   │   ├── 📁 components/          # Componentes UI reutilizables
│   │   ├── 📁 hooks/               # Hooks personalizados de React
│   │   ├── 📁 lib/                 # Librerías frontend
│   │   ├── 📁 screens/             # Pantallas principales de la app
│   │   ├── 📁 styles/              # Archivos CSS y de estilos
│   │   ├── 📁 types/               # Definiciones de tipos TypeScript
│   │   ├── 📁 utils/               # Utilidades frontend
│   │   ├── 📄 App.tsx              # Componente App principal
│   │   └── 📄 index.tsx            # Punto de entrada React
│   │
│   └── 📁 types/                   # Tipos TypeScript compartidos
│
├── 📁 build/                       # Assets de construcción (iconos, etc.)
├── 📁 dist/                        # Aplicación compilada
├── 📁 public/                      # Archivos públicos estáticos
├── 📁 release/                     # Releases empaquetados de la app
├── 📁 scripts/                     # Scripts de construcción y utilidades
│
├── 📄 package.json                 # Dependencias y scripts
├── 📄 tsconfig.json               # Configuración TypeScript
├── 📄 tsconfig.main.json          # Config TypeScript proceso main
├── 📄 vite.config.ts              # Configuración Vite
├── 📄 tailwind.config.js          # Configuración Tailwind CSS
└── 📄 README.md                   # Este archivo
```

## 📜 Scripts Disponibles

### Desarrollo
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor dev Vite (solo renderer) |
| `npm run electron-dev` | Iniciar app Electron completa en desarrollo | USAR ESTE - RECOMENDADO PARA DEV
| `npm run electron-dev:quiet` | Iniciar app Electron sin logs de consola |
| `npm run watch` | Vigilar archivos TypeScript por cambios |

### Producción
| Comando | Descripción |
|---------|-------------|
| `npm run build` | Construir la aplicación para producción |
| `npm run start` | Iniciar la aplicación construida |
| `npm run start:quiet` | Iniciar aplicación sin logs de consola |

### Empaquetado y Distribución
| Comando | Descripción |
|---------|-------------|
| `npm run pack` | Empaquetar app sin crear instalador |
| `npm run dist` | Crear instalador listo para distribución | USADO PARA DESPLIEGUE A MAQUINA

## ⚙️ Configuración

### Variables de Entorno
En versión actual no se está usando el archivo .env. Las configuraciones y variables están en dbConfig.ts

### Configuración de Hardware
- **Puerto Arduino**: Actualizar `ARDUINO_PORT` en `.env`
- **Configuración de Cámara**: Configurado en `src/main/ageVerification/`
- **Pasarela de Pagos**: Configurar en `src/main/payment/`

## 🔌 Integración de Hardware

### Comunicación con Arduino
La aplicación se comunica con Arduino vía Puerto Serie:
- **Configuración de Puerto**: Establecer en variables de entorno
- **Protocolo de Comandos**: Protocolo personalizado para dispensado de productos
- **Monitoreo de Estado**: Actualizaciones de estado de hardware en tiempo real

### Integración CH340 USB-a-Serie
- **Soporte de Drivers**: Detección automática del chipset CH340
- **Comunicación Confiable**: Puente de comunicación serie estable
- **Multiplataforma**: Funciona en Windows
- **Plug-and-Play**: Configuración mínima requerida

### Integración de Pagos Izipay
- **Transacciones Seguras**: Procesamiento de pagos compatible con PCI-DSS
- **Múltiples Métodos de Pago**: Tarjetas de crédito, débito y billeteras digitales
- **Procesamiento en Tiempo Real**: Validación instantánea de transacciones
- **Registro de Transacciones**: Rastro de auditoría completo para todos los pagos
- **Soporte de Webhooks**: Actualizaciones de estado de pago en tiempo real

### Integración de Cámara
- **Integración Human**: Para reconocimiento facial
- **Acceso a Webcam**: Detección automática de cámara
- **Procesamiento de Imágenes**: Detección y análisis facial en tiempo real

## 🚀 Despliegue

### Construcción para Producción
```bash
# 1. Construir la aplicación
npm run build

# 2. Crear instalador
npm run dist

# 3. Encontrar instalador en directorio release/
```

### Sistema de Auto-Actualización
La aplicación incluye un mecanismo de actualización automática:
- **Descargas en Segundo Plano**: Las actualizaciones se descargan en segundo plano
- **Notificación al Usuario**: Los usuarios son notificados cuando las actualizaciones están listas
- **Instalación Fluida**: Las actualizaciones se instalan al reiniciar

### Instalación en Máquina Expendedora
1. **Configuración Inicial**: Instalar usando el instalador generado
2. **Configuración**: Actualizar `.env` con valores de producción
3. **Conexión de Hardware**: Conectar Arduino y cámara
4. **Pruebas**: Realizar prueba completa del sistema
5. **Despliegue**: Desplegar al entorno de producción

## 🔧 Solución de Problemas

### Problemas Comunes

#### **La Aplicación No Inicia**
```bash
# Verificar versión de Node.js
node --version  # Debería ser 18+

# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

#### **Problemas de Comunicación con Arduino**
- Verificar que Arduino esté conectado y encendido
- Verificar puerto COM en Administrador de Dispositivos (Windows)
- Actualizar `ARDUINO_PORT` en archivo `.env`
- Asegurar que Arduino esté ejecutando el firmware correcto

#### **Problemas de Cámara/Verificación de Edad**
- Otorgar permisos de cámara a la aplicación
- Verificar que la cámara funcione en otras aplicaciones
- Actualizar controladores de cámara si es necesario

#### **Problemas de Conexión a Base de Datos**
- Verificar que MySQL esté ejecutándose
- Verificar credenciales de base de datos en `.env`
- Asegurar que la base de datos y tablas existan
- Probar conexión manualmente

#### **Problemas de Construcción/Empaquetado**
```bash
# Limpiar directorios de construcción
rm -rf dist build release

# Reconstruir dependencias nativas
npm run postinstall

# Intentar construir nuevamente
npm run build
```

### Modo Depuración
```bash
# Habilitar logging verboso
cross-env ELECTRON_ENABLE_LOGGING=1 npm run electron-dev

# Habilitar React Developer Tools
cross-env NODE_ENV=development npm run electron-dev
```

## 🤝 Contribuir

### Pautas de Desarrollo (si se sigue usando Github)
1. **Hacer Fork** del repositorio
2. **Crear** una rama de característica: `git checkout -b feature/caracteristica-increible`
3. **Hacer Commit** de cambios: `git commit -m 'Agregar característica increíble'`
4. **Push** a la rama: `git push origin feature/caracteristica-increible`
5. **Abrir** un Pull Request

### Estándares de Código
- **TypeScript**: Usar verificación de tipos estricta
- **ESLint**: Seguir las reglas configuradas
- **Formateo**: Usar Prettier para formateo consistente
- **Pruebas**: Escribir pruebas para nuevas características
- **Documentación**: Actualizar README y comentarios en línea


## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver el archivo [LICENSE](LICENSE) para detalles.
