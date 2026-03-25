# RETROVERSE OS: ESPECIFICACIÓN MAESTRA UNIFICADA (SSOT)
## Versión 1.0 - Marzo 2026
### "La Consola Retro Universal Basada en Navegador"

---

## 1. VISIÓN Y FILOSOFÍA DEL PROYECTO

**Retroverse OS** no es un emulador web; es una **Consola Virtual PWA** diseñada para unificar décadas de historia del videojuego en una interfaz moderna, social y de alto rendimiento.

### Pilares Fundamentales:
1.  **Acceso Universal:** Sin instalaciones, sin hardware dedicado. Funciona en móviles, tablets, PC y Smart TVs mediante tecnología PWA.
2.  **Inmediatez (Zero-Friction):** "Abrir y Jugar". El sistema gestiona automáticamente la descarga, validación y ejecución de ROMs.
3.  **Inteligencia Autónoma (The Sentinel):** Un motor de ingestión que descubre, normaliza y valida catálogos masivos sin intervención humana.
4.  **Social por Diseño:** Multijugador online (Netplay) nativo, torneos, rankings y comunidad integrada.
5.  **Neutralidad Tecnológica (BYOR):** La plataforma es un reproductor multimedia especializado que utiliza núcleos de emulación de código abierto (Libretro/WASM).

---

## 2. ARQUITECTURA TÉCNICA REAL (STACK ACTUAL)

Basado en el análisis del código fuente activo:

*   **Frontend:** React 18 + Vite (SPA).
*   **Estilos:** Tailwind CSS + Framer Motion (Animaciones de interfaz de consola).
*   **Motor de Emulación:** Nostalgist.js (Libretro cores compilados a WebAssembly).
*   **Base de Datos Local:** IndexedDB (vía `localforage`) para persistencia de catálogo, favoritos y estados de guardado.
*   **Backend & Real-Time:** Supabase (Autenticación, Gestión de Salas, Señalización WebRTC).
    *   **Métodos de Autenticación:** Google OAuth, Correo/Contraseña y Autenticación Anónima (Invitado).
*   **Networking:** WebRTC P2P para Netplay de baja latencia.
*   **Fuentes de Datos:**
    *   **ROMs Verificadas:** Myrient (No-Intro/Redump) vía HTTPS.
    *   **Descubrimiento Autónomo:** Archive.org API.
    *   **Metadatos/Arte:** Libretro Thumbnails CDN (Boxart, Snaps, Titles).

---

## 3. SISTEMA DE INGESTIÓN: "THE SENTINEL"

El corazón de Retroverse es el **SentinelAgent**, un orquestador autónomo que mantiene la biblioteca actualizada.

### 3.1 ScoutAgent (Búsqueda en Archive.org)
Implementado en `src/services/ScoutAgent.ts`, este agente realiza búsquedas inteligentes:
*   **Estrategia de Búsqueda:** Utiliza consultas variadas (Strict, Loose, Broad) para maximizar resultados.
*   **Filtros de Calidad:** Solo indexa archivos con extensiones válidas (`.nes`, `.sfc`, `.gba`, etc.) y tamaño > 0.
*   **Sanitización:** Limpia prefijos de sistema y etiquetas de región para una normalización limpia.

### 3.2 Metadata Normalization Engine
Ubicado en `src/services/metadataNormalization.ts`, transforma datos caóticos en un `GameObject` uniforme:
*   **Campos:** `game_id`, `title`, `system`, `year`, `publisher`, `developer`, `players`, `rom_url`, `cover_url`, `artwork_url`, `emulator_core`, `compatibility_status`.
*   **game_id:** Generado de forma determinista (slugified) para evitar duplicados.
*   **Triple Art Cascade:** Sistema de fallback para arte:
    1.  Libretro Thumbnails (Named Boxarts).
    2.  Libretro Thumbnails (Named Snaps).
    3.  Archive.org Metadata Images.

---

## 4. MOTOR DE EMULACIÓN (EMULATION CORE SYSTEM)

Retroverse utiliza **Nostalgist** para ejecutar núcleos Libretro en el navegador.

### 4.1 Cores Implementados y Verificados
| Sistema | Core Libretro | Fuente WASM (CDN) |
| :--- | :--- | :--- |
| **NES** | `fceumm` | jsdelivr / buildbot.libretro.com |
| **SNES** | `snes9x` | jsdelivr / buildbot.libretro.com |
| **Genesis** | `genesis_plus_gx` | jsdelivr / buildbot.libretro.com |
| **GBA** | `mgba` | jsdelivr / buildbot.libretro.com |
| **GBC/GB** | `gambatte` | jsdelivr / buildbot.libretro.com |
| **N64** | `mupen64plus_next` | jsdelivr / buildbot.libretro.com |
| **PSX** | `pcsx_rearmed` | jsdelivr / buildbot.libretro.com |

### 4.2 Pipeline de Lanzamiento
1.  **Selección:** El usuario elige un juego del `GameCatalog`.
2.  **Preparación:** `EmulatorService` resuelve la URL de la ROM y el Core WASM.
3.  **Carga:** Descarga de la ROM (vía streaming/buffer) y el Core.
4.  **Ejecución:** Inicialización de Nostalgist con mapeo de controles automático (Gamepad API).
5.  **Persistencia:** Los `Save States` y `SRAM` se guardan automáticamente en IndexedDB.

---

## 5. MULTIJUGADOR Y NETPLAY (REAL-TIME)

A diferencia de las especificaciones iniciales, el multiplayer **ya está operativo** en el código actual (`src/services/multiplayer.ts`).

### 5.1 Arquitectura de Red
*   **Protocolo:** WebRTC DataChannels para transmisión de inputs (no video).
*   **Configuración de Canal:** 
    *   `ordered: false` (UDP-like) para evitar bloqueos por pérdida de paquetes.
    *   `maxRetransmits: 0` para priorizar siempre el input más reciente.
*   **Infraestructura ICE:** Utiliza servidores STUN de Google y Twilio para NAT Traversal.
*   **Sincronización:** Modelo de sincronización de inputs con monitoreo de latencia (Ping/Pong integrado).
*   **Señalización:** Supabase Realtime gestiona la creación de salas (`rooms`) y el intercambio de ofertas/respuestas WebRTC mediante canales de broadcast.
*   **Matchmaking:** Sistema de emparejamiento dinámico basado en `presence` de Supabase, permitiendo a los usuarios encontrar oponentes por `gameId`.
*   **Chat:** Sistema de chat integrado en tiempo real dentro de las salas de juego.

---

## 6. INTERFAZ DE USUARIO (UX/UI)

Diseñada para emular la experiencia de una consola física de alta gama.

### 6.1 Componentes de Diseño
*   **Dashboard Dinámico:** Carruseles horizontales categorizados por sistema.
*   **Visualización:** Uso de `framer-motion` para transiciones suaves y efectos de "hover" escalados.
*   **Responsividad:** Layout adaptativo que prioriza el uso de Gamepad en Desktop/TV y Touch Overlay en móviles.
*   **Boot Animation:** Secuencia de inicio cinematográfica que refuerza la identidad de marca "Retroverse".

---

## 7. SISTEMA DE MONITOREO Y TELEMETRÍA: "SENTINEL"

Implementado en `src/services/sentinel.ts`, este servicio actúa como una "caja negra" que audita el rendimiento y la estabilidad de la plataforma en tiempo real.

### 7.1 Capacidades de Auditoría
*   **Captura de Errores:** Intercepta `console.error`, `window.onerror` y `unhandledrejection` para generar reportes detallados con stack traces.
*   **Intercepción de Red:** Monitorea todas las llamadas `fetch` para detectar fallos en la descarga de ROMs o comunicación con APIs, registrando latencia y códigos de estado.
*   **Monitoreo de Imágenes:** Detecta fallos en la carga de carátulas y arte, alimentando el sistema de fallback.
*   **Rendimiento (FPS):** Monitorea caídas de frames por debajo de 30 FPS para identificar cuellos de botella en la emulación.
*   **Auto-Traversal:** Capacidad de realizar recorridos automáticos por las rutas de la aplicación para verificar la integridad de la navegación y las acciones críticas (Play, Create Room, etc.).

---

## 8. ESTRATEGIA DE CONTENIDO Y LEGALIDAD

Retroverse opera bajo un modelo de **Neutralidad Tecnológica**.

*   **Verified Catalog:** Lista curada de ~500 clásicos (Myrient) para asegurar una experiencia perfecta "out-of-the-box".
*   **Extended Library:** Millones de títulos accesibles vía Archive.org mediante el ScoutAgent.
*   **Safe Harbor:** La plataforma no aloja ROMs; actúa como un cliente que conecta al usuario con repositorios públicos o archivos locales.

---

## 8. ROADMAP TÉCNICO ACTUALIZADO

1.  **Fase 1 (Completada):** Motor de emulación WASM, Ingestión básica, UI Prototipo.
2.  **Fase 2 (Actual):** Netplay operativo, Normalización de metadatos avanzada, Persistencia en IndexedDB.
3.  **Fase 3 (Próxima):** Sistema de Logros (Achievements) vía análisis de memoria, Torneos integrados, Optimización de cores pesados (N64/PSX).

---

**Nota Final:** Este documento es el único punto de referencia válido para el desarrollo de Retroverse OS. Cualquier discrepancia con documentos anteriores queda resuelta a favor de esta especificación, la cual refleja el estado real y verificado del código fuente.
