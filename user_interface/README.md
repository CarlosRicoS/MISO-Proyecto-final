# user_interface

Cliente Ionic + Angular para TravelHub. Este proyecto entrega la experiencia web y la app Android (vía Capacitor), incluyendo cobertura E2E automatizada para ambas plataformas.

## Descripción general

Flujos principales implementados actualmente:

- Flujo de descubrimiento en inicio (home)
- Flujo de resultados de búsqueda con filtros (ciudad, huéspedes, fechas)
- Flujo de detalle de propiedad

Los usuarios objetivo son viajeros que buscan y reservan alojamientos.

## Arquitectura

Esta UI usa una estructura por capas en Angular:

- Shell de aplicación y composición de rutas en src/app
- Capa core para servicios compartidos y responsabilidades globales en src/app/core
- Bloques visuales reutilizables en src/app/shared
- Pantallas de ruta a nivel de página en src/app/pages

El enrutamiento es lazy-loaded y actualmente incluye:

- /home
- /search-results
- /propertydetail

Flujo de datos:

- Las páginas UI llaman servicios desde src/app/core/services
- HotelsService solicita datos de propiedades vía HTTP
- ConfigService carga valores de runtime desde src/assets/config.json

## Stack tecnológico

- Angular 20
- Ionic Angular 8
- Capacitor 8 (objetivo Android)
- TypeScript 5.9
- Playwright para E2E web
- Espresso (espresso-core + espresso-web) para E2E Android

## Estructura del proyecto

Carpetas clave:

- src/app/core: servicios y lógica transversal de la aplicación
- src/app/shared: componentes UI reutilizables, directivas y pipes
- src/app/pages: páginas asociadas a rutas
- src/assets: estáticos y configuración de runtime
- android: proyecto contenedor nativo de Android
- e2e/web: suites de Playwright
- e2e/android: suites de Espresso

## Configuración

Prerrequisitos:

- Node.js 20.19+ o 22.12+ recomendado por el toolchain de Angular
- npm
- Android Studio (para Android SDK, emulador y herramientas de dispositivo)
- Java 17+ (JDK)

Instalación de dependencias:

1. cd user_interface
2. npm install

Instalación limpia opcional:

1. cd user_interface
2. npm ci

## Ejecución

Servidor de desarrollo web:

1. cd user_interface
2. npm start

Compilar aplicación web:

1. cd user_interface
2. npm run build

Compilar con valores de runtime para API:

1. cd user_interface
2. API_BASE_URL=https://your-api.example.com PROPERTY_API_PATH=/poc-properties/api/property PROPERTY_API_TOKEN=your_token npm run build

Preparar proyecto nativo Android:

1. cd user_interface
2. npm run android:sync

Abrir en Android Studio:

1. cd user_interface
2. npx cap open android

## Guía de pruebas

## Pruebas web (Angular + Ionic)

Pruebas manuales:

1. Ejecutar npm start
2. Validar flujos principales: home, search-results, propertydetail
3. Validar comportamiento de formularios, navegación y estados de error
4. Validar comportamiento responsive

Pruebas unitarias automatizadas:

1. cd user_interface
2. npm test

Pruebas E2E automatizadas con Playwright:

1. cd user_interface
2. npm run e2e:web

Comando único para levantar la app y correr E2E web:

1. cd user_interface
2. npm run e2e:web:with-app

Modo interactivo de Playwright:

1. cd user_interface
2. npm run e2e:web:ui

## Pruebas Android

Compilar y sincronizar assets web en Android:

1. cd user_interface
2. npm run android:sync

Ejecución en emulador/dispositivo desde Android Studio:

1. cd user_interface
2. npx cap open android
3. Seleccionar emulador o dispositivo físico y ejecutar la app

Pruebas instrumentadas automatizadas Android (suite Espresso):

1. Iniciar emulador o conectar dispositivo
2. cd user_interface
3. npm run e2e:android

Ejecutar clase específica de Espresso:

1. Iniciar emulador o conectar dispositivo
2. cd user_interface
3. npm run e2e:android:espresso

Ubicación actual de la suite E2E Android:

- e2e/android/com/uniandes/travelhub/app/TravelHubEspressoTest.java

Generación de APK:

1. cd user_interface/android
2. ./gradlew assembleDebug

APK esperado:

- android/app/build/outputs/apk/debug/app-debug.apk

## Estrategia E2E

- Playwright en e2e/web valida flujos de navegador
- Espresso en e2e/android replica escenarios críticos de Playwright para Android WebView
- Ambas suites se enfocan en selectores determinísticos y aserciones estables

## Buenas prácticas

- Mantener componentes compartidos agnósticos de plataforma y reutilizables
- Mantener selectores estables para automatización
- Mantener lógica de negocio en servicios, no en plantillas
- Mantener alineados los escenarios de Playwright y Espresso cuando cambien flujos

## Notas

- Si falta Gradle wrapper en android/gradle/wrapper, restáuralo antes de ejecutar pruebas Android.
- Las pruebas instrumentadas Android requieren un emulador activo o un dispositivo conectado visible en adb devices.
