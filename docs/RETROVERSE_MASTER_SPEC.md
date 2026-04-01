# RETROVERSE OS: ESPECIFICACIÓN MAESTRA UNIFICADA (SSOT)
## Versión 1.2 - Marzo 2026
### "La Consola Virtual PWA Definitiva"

---

## 1. VISIÓN Y FILOSOFÍA DEL PROYECTO

**Retroverse OS** no es simplemente un emulador web; es una **Consola Virtual PWA** diseñada para unificar décadas de historia del videojuego en una interfaz moderna, social y de alto rendimiento. El proyecto se basa en la premisa de "Zero-Friction": abrir el navegador y jugar instantáneamente, sin instalaciones ni configuraciones complejas.

### Pilares Fundamentales:
1.  **Acceso Universal (PWA):** Funciona en móviles, tablets, PC y Smart TVs mediante tecnología Progressive Web App.
2.  **Inmediatez (Zero-Friction):** Gestión automática de descarga, validación y ejecución de ROMs.
3.  **Inteligencia Autónoma (The Sentinel):** Un motor de ingestión que descubre, normaliza y valida catálogos masivos.
4.  **Social por Diseño:** Multijugador online (Netplay) nativo, torneos y rankings.
5.  **Neutralidad Tecnológica (BYOR):** Reproductor multimedia especializado que utiliza núcleos Libretro/WASM.

---

## 2. MAPA DE ARCHIVOS Y ESTRUCTURA DEL PROYECTO

### 2.1 Directorios Principales
*   `/src/components/`: Componentes UI (Library, Room, UI Elements).
*   `/src/services/`: Lógica de negocio, agentes y servicios de emulación.
*   `/src/pages/`: Vistas principales (Dashboard, GameRoom, Netplay, Settings).
*   `/src/hooks/`: Hooks personalizados para estado y eventos.
*   `/src/lib/`: Utilidades y configuraciones de terceros (Supabase, Utils).
*   `/api/`: Edge Functions (Vercel) para proxy y backend ligero.
*   `/public/`: Assets estáticos, Service Worker y BIOS.

### 2.2 Archivos Críticos
*   `src/main.tsx`: Punto de entrada, registro de SW y lógica de aislamiento (SAB).
*   `src/App.tsx`: Enrutamiento y layout global.
*   `public/sw.js`: Service Worker maestro (Caché + Inyección de cabeceras COOP/COEP).
*   `api/tunnel.ts`: Proxy Edge para bypass de CORS y seguridad de recursos.
*   `vercel.json`: Configuración de despliegue y cabeceras de servidor.

---

## 3. ARQUITECTURA DE SERVICIOS Y FUNCIONES CLAVE

### 3.1 Emulation Engine (`src/services/emulator.ts`)
Gestiona el ciclo de vida de Nostalgist.js y los núcleos Libretro.
*   `initialize(config, onProgress)`: Configura el core, carga BIOS y arranca el emulador.
*   `loadState(slot)` / `saveState(slot)`: Persistencia de estados en IndexedDB.
*   `exit()`: Limpieza de memoria y cierre de AudioContexts.
*   `handleInput(button, pressed)`: Puente entre el InputManager y el core WASM.

### 3.2 The Sentinel Agent (`src/services/sentinel.ts`)
Auditoría en tiempo real y telemetría.
*   `start()`: Inicia la captura de errores, red y performance.
*   `runAutoTraversal(navigate)`: Recorrido automático de rutas para verificar integridad.
*   `getFullReport()`: Genera el snapshot actual de la salud del sistema.

### 3.3 Scout & Discovery (`src/services/ScoutAgent.ts`)
Ingestión autónoma de ROMs desde Archive.org.
*   `search(query)`: Búsqueda multinivel (Strict/Loose/Broad).
*   `validateRom(item)`: Verifica extensiones y metadatos mínimos.
*   `normalize(item)`: Convierte el formato de Archive.org al `GameObject` de Retroverse.

### 3.4 Netplay Service (`src/services/netplayService.ts`)
Orquestación de sesiones multijugador.
*   `createRoom(gameId)`: Registra una nueva sala en Supabase.
*   `joinRoom(roomId)`: Inicia el handshake WebRTC.
*   `broadcastInput(input)`: Envía el estado del control al peer remoto.

---

## 4. FLUJOS LÓGICOS DETALLADOS

### 4.1 Flujo de Lanzamiento de Juego (Game Launch)
1.  **UI:** Usuario hace clic en "Jugar".
2.  **Catalog:** Se obtiene el `GameObject` (ROM URL, System).
3.  **EmulatorService:**
    *   Verifica disponibilidad de `SharedArrayBuffer`.
    *   Resuelve el Core WASM (ej. `snes9x`).
    *   Descarga la ROM vía `ROMFetchService` (pasa por `/api/tunnel`).
    *   Carga BIOS si es necesario (PSX/GBA).
4.  **Nostalgist:** Inicializa el worker WASM y adjunta el canvas.
5.  **Input:** Se activa el `InputManager` para Gamepad/Touch.

### 4.2 Flujo de Habilitación de SharedArrayBuffer (SAB)
1.  **Carga Inicial:** `main.tsx` verifica `window.crossOriginIsolated`.
2.  **Fallo:** Si es `false`, registra `sw.js`.
3.  **Activación:** El Service Worker toma el control (`clients.claim()`).
4.  **Recarga:** `main.tsx` detecta el cambio de controlador y recarga la página.
5.  **Interceptación:** `sw.js` intercepta la petición del documento e inyecta:
    *   `Cross-Origin-Embedder-Policy: require-corp`
    *   `Cross-Origin-Opener-Policy: same-origin`
6.  **Resultado:** `crossOriginIsolated` es `true`, permitiendo hilos de emulación (N64/PSX).

### 4.3 Flujo de Ingestión de Metadatos (Sentinel Ingestion)
1.  **Trigger:** El usuario busca un juego o el sistema inicia un "Scout".
2.  **Archive.org API:** Se obtienen resultados crudos.
3.  **Normalization:** `metadataNormalization.ts` limpia títulos y asigna cores.
4.  **Cover Cascade:**
    *   Busca en Libretro Thumbnails (Named Boxarts).
    *   Si falla -> Libretro Snaps.
    *   Si falla -> Archive.org Metadata.
    *   Si falla -> Bing Image Search Fallback.
5.  **Cache:** Se guarda el `GameObject` en `localforage` para acceso offline.

---

## 5. MODELO DE DATOS Y PERSISTENCIA

### 5.1 IndexedDB (LocalForage)
*   `retroos_catalog`: Caché de juegos descubiertos y normalizados.
*   `retroos_favorites`: Lista de IDs de juegos favoritos.
*   `retroos_saves`: Blobs de estados de guardado (`.state`) y SRAM (`.srm`).
*   `retroos_covers`: Caché de URLs de portadas verificadas.

### 5.2 Supabase (PostgreSQL / Realtime)
*   `rooms`: `id`, `game_id`, `host_id`, `status`, `created_at`.
*   `presence`: Estado online de usuarios y latencia.
*   `profiles`: `id`, `username`, `avatar_url`, `achievements`.

---

## 6. MULTIJUGADOR Y SINCRONIZACIÓN

*   **Protocolo:** WebRTC DataChannels (UDP-like).
*   **Sincronización:** Input-based (no se envía video).
*   **Handshake:** 
    1. Host crea oferta SDP -> Supabase.
    2. Guest lee oferta -> Crea respuesta SDP -> Supabase.
    3. Intercambio de candidatos ICE.
    4. Conexión P2P establecida.

---

## 7. SEGURIDAD Y CUMPLIMIENTO

*   **CORS Bypass:** Todas las peticiones externas (Myrient, Libretro, Archive) se realizan a través de `/api/tunnel`.
*   **Sanitización:** Los nombres de archivos y URLs se limpian para evitar inyecciones en el motor WASM.
*   **Aislamiento:** Uso estricto de COOP/COEP para prevenir ataques de canal lateral (Spectre/Meltdown) y habilitar SAB.

---

**Nota Final:** Este documento es el único punto de referencia válido (SSOT) para el desarrollo de Retroverse OS. Refleja la implementación técnica real y debe actualizarse ante cualquier cambio estructural en el código.
