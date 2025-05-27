# 🚬 Vape Vending Machine - Electron Application

> A modern, intelligent vending machine application built with Electron, React, and TypeScript that manages vape product dispensing with advanced age verification, payment processing, and hardware integration.

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Hardware Integration](#hardware-integration)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

This Electron-based application powers a smart vape vending machine with comprehensive features including:
- **Touchscreen User Interface** for product selection
- **Advanced Age Verification** using facial recognition and ID scanning
- **Secure Payment Processing** via Izipay integration
- **Hardware Control** for product dispensing via Arduino
- **Real-time Inventory Management**
- **Automatic Updates** for remote maintenance

## ✨ Features

### 🔐 Age Verification
- **Facial Recognition** using Human
- **ID Document Scanning** with Regula Document Reader

### 💳 Payment Integration
- **Izipay Payment Gateway** for secure transactions
- **Multiple Payment Methods** support
- **Transaction Logging**

### 🤖 Hardware Integration
- **Arduino Communication** via Serial Port
- **CH340 USB-to-Serial** - Microcontroller communication bridge
- **Izipay SDK** - Payment gateway integration
- **Regula SDKs** - Document and face verification

### 🎨 User Interface
- **Modern React UI** with Tailwind CSS
- **Touch-optimized Interface** for kiosk usage
- **Accessibility Features** for inclusive design

### 🔄 System Management
- **Database Management** for products and transactions

## 🛠 Tech Stack

### Frontend (Renderer Process)
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **Lucide React** - Icon library

### Backend (Main Process)
- **Node.js** - Runtime environment
- **Electron** - Desktop app framework
- **Express** - HTTP server framework
- **TypeScript** - Type-safe JavaScript

### Database & Storage
- **MySQL2** - Database driver
- **Electron Store** - Persistent storage

### Hardware & Integration
- **SerialPort** - Arduino communication
- **CH340 USB-to-Serial** - Microcontroller communication bridge
- **Izipay SDK** - Payment gateway integration
- **Regula SDKs** - Document and face verification

### Development Tools
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Electron Builder** - App packaging
- **Concurrently** - Run multiple commands

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** for version control
- **Python** (v3.8+) for native dependencies
- **Visual Studio Build Tools** (Windows) or **Xcode** (macOS)

### Hardware Requirements
- **Windows 10/11** (primary target platform)
- **4GB RAM minimum** (8GB recommended)
- **USB ports** for Arduino communication
- **Camera/Webcam** for age verification
- **Touch-capable display** (optional, mouse/keyboard supported)

### Optional but Recommended
- **Arduino IDE** for hardware development
- **MySQL Workbench** for database management
- **Postman** for API testing

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/vape-vending-machine.git
cd vape-vending-machine
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install
```

### 3. Environment Setup

WARNING! Currently a .env file is not being used, but vairables in different files like dbConfig.ts

Create a `.env` file in the root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=vending_machine

# Payment Gateway
IZIPAY_API_KEY=your_izipay_api_key
IZIPAY_SECRET_KEY=your_izipay_secret_key

# Age Verification
REGULA_API_KEY=your_regula_api_key
REGULA_SECRET_KEY=your_regula_secret_key

# Hardware
ARDUINO_PORT=COM3
ARDUINO_BAUD_RATE=9600

# Development
NODE_ENV=development
ELECTRON_ENABLE_LOGGING=1
```

### 4. Database Setup
```bash
# Create database and tables
# (Run your SQL migration scripts here)
```

## 🛠 Development

### Starting Development Server
```bash
# Start the development environment
npm run electron-dev

# Start quietly (no console logs)
npm run electron-dev:quiet

# Start only the renderer process (for UI development)
npm run dev
```

### Development Workflow
1. **Frontend Development**: Modify files in `src/renderer/`
2. **Backend Development**: Modify files in `src/main/`
3. **Hot Reloading**: Changes are automatically reflected
4. **Debugging**: Use Chrome DevTools for renderer, Node debugger for main

### Code Quality
```bash
# Run linting
npm run lint

# Run tests
npm run test

# Type checking
npx tsc --noEmit
```

## 📁 Project Structure

```
vape-vending-machine/
├── 📁 src/
│   ├── 📁 main/                    # Electron Main Process
│   │   ├── 📁 ageVerification/     # Age verification logic
│   │   ├── 📁 database/            # Database connections & queries
│   │   ├── 📁 hardware/            # Arduino communication
│   │   ├── 📁 ipc/                 # Inter-process communication
│   │   ├── 📁 payment/             # Payment processing
│   │   ├── 📁 services/            # Business logic services
│   │   ├── 📁 utils/               # Utility functions
│   │   ├── 📄 main.ts              # Main entry point
│   │   └── 📄 preload.ts           # Context bridge
│   │
│   ├── 📁 renderer/                # React Frontend
│   │   ├── 📁 ageVerification/     # Age verification UI
│   │   ├── 📁 assets/              # Images, videos, fonts
│   │   ├── 📁 components/          # Reusable UI components
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   ├── 📁 lib/                 # Frontend libraries
│   │   ├── 📁 screens/             # Main application screens
│   │   ├── 📁 styles/              # CSS and styling files
│   │   ├── 📁 types/               # TypeScript type definitions
│   │   ├── 📁 utils/               # Frontend utilities
│   │   ├── 📄 App.tsx              # Main App component
│   │   └── 📄 index.tsx            # React entry point
│   │
│   └── 📁 types/                   # Shared TypeScript types
│
├── 📁 build/                       # Build assets (icons, etc.)
├── 📁 dist/                        # Compiled application
├── 📁 public/                      # Static public files
├── 📁 release/                     # Packaged app releases
├── 📁 scripts/                     # Build and utility scripts
│
├── 📄 package.json                 # Dependencies and scripts
├── 📄 tsconfig.json               # TypeScript configuration
├── 📄 tsconfig.main.json          # Main process TypeScript config
├── 📄 vite.config.ts              # Vite configuration
├── 📄 tailwind.config.js          # Tailwind CSS configuration
└── 📄 README.md                   # This file
```

## 📜 Available Scripts

### Development
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (renderer only) |
| `npm run electron-dev` | Start full Electron app in development | USE THIS - RECOMMENDED FOR DEV
| `npm run electron-dev:quiet` | Start Electron app without console logs |
| `npm run watch` | Watch TypeScript files for changes |

### Production
| Command | Description |
|---------|-------------|
| `npm run build` | Build the application for production |
| `npm run start` | Start the built application |
| `npm run start:quiet` | Start application without console logs |

### Packaging & Distribution
| Command | Description |
|---------|-------------|
| `npm run pack` | Package app without creating installer |
| `npm run dist` | Create distribution-ready installer | USED FOR DEPLOY TO MACHINE

### Quality Assurance
| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint code analysis |
| `npm run test` | Run Jest test suite |

## ⚙️ Configuration


### Environment Variables
In the current version, the .env file is not being used. Configurations and variables are in dbConfig.ts

### Hardware Configuration
- **Arduino Port**: Update `ARDUINO_PORT` in `.env`
- **Camera Settings**: Configured in `src/main/ageVerification/`
- **Payment Gateway**: Configure in `src/main/payment/`

## 🔌 Hardware Integration

### Arduino Communication
The application communicates with Arduino via Serial Port:
- **Port Configuration**: Set in environment variables
- **Command Protocol**: Custom protocol for product dispensing
- **Status Monitoring**: Real-time hardware status updates

### CH340 USB-to-Serial Integration
- **Driver Support**: Automatic detection of CH340 chipset
- **Reliable Communication**: Stable serial communication bridge
- **Cross-Platform**: Works on Windows
- **Plug-and-Play**: Minimal configuration required

### Izipay Payment Integration
- **Secure Transactions**: PCI-DSS compliant payment processing
- **Multiple Payment Methods**: Credit cards, debit cards, and digital wallets
- **Real-time Processing**: Instant transaction validation
- **Transaction Logging**: Complete audit trail for all payments
- **Webhook Support**: Real-time payment status updates

### Camera Integration
- **Webcam Access**: Automatic camera detection
- **Image Processing**: Real-time face detection and analysis

## 🚀 Deployment

### Building for Production
```bash
# 1. Build the application
npm run build

# 2. Create installer
npm run dist

# 3. Find installer in release/ directory
```

### Auto-Update System
The application includes an automatic update mechanism:
- **Background Downloads**: Updates download in the background
- **User Notification**: Users are notified when updates are ready
- **Seamless Installation**: Updates install on restart

### Installation on Vending Machine
1. **Initial Setup**: Install using the generated installer
2. **Configuration**: Update `.env` with production values
3. **Hardware Connection**: Connect Arduino and camera
4. **Testing**: Perform full system test
5. **Deployment**: Deploy to production environment

## 🔧 Troubleshooting

### Common Issues

#### **Application Won't Start**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Arduino Communication Issues**
- Verify Arduino is connected and powered
- Check COM port in Device Manager (Windows)
- Update `ARDUINO_PORT` in `.env` file
- Ensure Arduino is running correct firmware

#### **Camera/Age Verification Problems**
- Grant camera permissions to the application
- Check camera is working in other applications
- Update camera drivers if necessary

#### **Database Connection Issues**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database and tables exist
- Test connection manually

#### **Build/Package Issues**
```bash
# Clean build directories
rm -rf dist build release

# Rebuild native dependencies
npm run postinstall

# Try building again
npm run build
```

### Debug Mode
```bash
# Enable verbose logging
cross-env ELECTRON_ENABLE_LOGGING=1 npm run electron-dev

# Enable React Developer Tools
cross-env NODE_ENV=development npm run electron-dev
```


### Development Guidelines
1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Code Standards
- **TypeScript**: Use strict type checking
- **ESLint**: Follow the configured rules
- **Formatting**: Use Prettier for consistent formatting
- **Testing**: Write tests for new features
- **Documentation**: Update README and inline comments


## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
