# RETROVERSE

## Universal Game Library System – Final Implementation Specification

---

### 1. Objective

Construir un sistema de biblioteca universal de videojuegos retro capaz de:
- Indexar automáticamente el catálogo público disponible en Archive.org
- Normalizar metadatos inconsistentes
- Lanzar juegos en navegador mediante emulación WebAssembly
- Implementar validación y fallback automático para evitar fallos de ejecución
- Escalar a decenas de miles de títulos

El sistema debe ser auto-reparable, auto-actualizable y tolerante a fallos.

---

### 2. High Level Architecture

Retroverse se compone de cinco subsistemas principales:
Retroverse Frontend -> Library Service -> Metadata Database -> ROM Fetch Service -> Emulation Engine Manager

Componentes auxiliares:
- Compatibility Engine
- ROM Validator
- Cache Layer
- Error Recovery System
- Telemetry System

---

### 3. Archive.org Catalog Integration (Todos los Sistemas)

Fuentes iniciales obligatorias:
- Atari 2600 → softwarelibrary_atari2600
- Atari 5200 → softwarelibrary_atari5200
- Atari 7800 → softwarelibrary_atari7800
- NES → softwarelibrary_nes
- SNES → softwarelibrary_snes
- Sega Genesis / Mega Drive → softwarelibrary_sega_genesis
- Sega Master System → softwarelibrary_sega_master_system
- GameBoy → softwarelibrary_gameboy
- GameBoy Color → softwarelibrary_gameboycolor
- GameBoy Advance → softwarelibrary_gameboyadvance
- Nintendo 64 → softwarelibrary_n64
- PlayStation 1 → softwarelibrary_ps1
- PlayStation 2 (limitado) → softwarelibrary_ps2
- Arcade → softwarelibrary_arcade
- MS-DOS → softwarelibrary_msdos
- Amiga → softwarelibrary_amiga
- Commodore 64 → softwarelibrary_c64
- NeoGeo → softwarelibrary_neogeo

Flujo de indexación obligatorio:
1. Recorrer todas las páginas de cada colección usando la API de Archive.org:
   `https://archive.org/advancedsearch.php?q=collection:(<collection_name>)&fl[]=identifier,title,description,creator,date&rows=500&page=1&output=json`
2. Extraer metadatos de cada título.
3. Detectar archivos ROM válidos según la extensión del sistema.
4. Verificar integridad básica (existencia de archivo y tamaño >0).
5. Enviar metadata al Metadata Normalization Engine para limpiar, asignar sistema correcto y eliminar duplicados.

Extensiones soportadas por sistema:
- Atari 2600/5200/7800: .bin, .a26, .a52, .a78
- NES: .nes
- SNES: .sfc, .smc
- Genesis / Mega Drive: .gen, .bin
- Master System: .sms
- GameBoy: .gb
- GameBoy Color: .gbc
- GameBoy Advance: .gba
- Nintendo 64: .n64, .z64
- PlayStation 1: .bin, .cue, .iso
- PlayStation 2: .iso
- Arcade: .zip
- MS-DOS: .zip, .jsdos
- Amiga: .adf, .adz
- Commodore 64: .d64, .tap, .prg
- NeoGeo: .zip, .neo

Notas importantes:
- El indexador debe ser multi-colección y recorrer todos los catálogos en paralelo si es posible.
- Debe ignorar duplicados y mantener la versión más completa o funcional de cada ROM.
- Cada juego debe recibir un emulator_core recomendado según el sistema.
- Toda ROM descargada debe pasar por el ROM Validator antes de aparecer en la biblioteca.

---

### 4. Metadata Normalization Engine
Crear modelo interno uniforme:
- game_id, title, system, year, publisher, players, rom_url, cover_url, rom_size, emulator_core, compatibility_status, checksum
- Eliminar duplicados
- Corregir títulos
- Asignar sistema correcto
- Verificar ROM principal

---

### 5. Emulator Core System
Cada sistema utiliza un core WASM optimizado.
Cores recomendados por sistema:
- NES: FCEUmm WASM
- SNES: Snes9x WASM
- Genesis: Genesis Plus GX WASM
- GameBoy: Gambatte WASM
- GBA: mGBA WASM
- Arcade: FinalBurn Neo WASM
- MS-DOS: DOSBox WASM
- PS1: PCSX WASM
- PS2: PCSX2 WASM (limitado)

Cada core se ejecuta dentro de GameRuntimeContainer: input mapping, audio, video buffer, save states

---

### 6. Game Launch Pipeline
Flujo:
User clicks Play -> Library Service obtiene metadata -> Compatibility Engine valida soporte -> ROM Fetch Service descarga ROM -> ROM Validator verifica integridad -> ROM → ArrayBuffer -> Engine Manager carga emulator core -> ROM montada en virtual filesystem -> Emulator boot
Si falla algún paso → fallback automático

---

### 7. ROM Validation System
Verificaciones: file exists, file size > 0, checksum verification (CRC32, MD5), valid extension, header integrity
Estado: compatibility_status = broken
Evitar mostrar botón Play si está roto

---

### 8. Compatibility Engine
Estados de juego: compatible, unstable, broken, untested
Si un juego falla >3 veces → unstable
Si falla en inicialización → broken

---

### 9. ROM Fetch System
Descarga directamente desde Archive.org
Streaming directo a emulador
Cache local opcional: IndexedDB, max 2GB, LRU eviction

---

### 10. Error Recovery System
Fallback automático ante: ROM corrupta, emulador incompatible, ROM comprimida incorrectamente, archivo incorrecto
Estrategias: reintento descarga, cambiar core, releer metadata, limpiar cache local

---

### 11. Performance Optimization
ROM streaming, Lazy loading de cores, Web Workers para emulación, Frame skipping en móviles
Target: 60fps desktop, 30fps mobile

---

### 12. Input System
Keyboard, Gamepad API, Touch overlay
Map estándar: NES, SNES, Genesis
Detección automática de gamepad

---

### 13. Save System
Save states y battery saves
Almacenamiento IndexedDB
Guardado automático cada 30s

---

### 14. Multiplayer Future Support
Preparado para netplay
NetplayAdapter → WebRTC, Rollback netcode
Implementación diferida

---

### 15. Telemetry System
Registrar eventos: launch success/failure, fps, core crashes
Alimenta Compatibility Engine

---

### 16. Library Update System
Indexador periódico (24h)
Detectar nuevos títulos, normalizar metadata, insertar en DB

---

### 17. User Experience Rules
Mostrar solo: compatible, untested
Ocultar: broken
Advertencia: unstable

---

### 18. Security Measures
Sandbox obligatorio, iframe isolation, CSP policies, ROM validation
Nunca ejecutar código externo directo

---

### 19. Scalability Targets
Inicial: 5,000 juegos jugables
Escalado: 20,000+ títulos
Infraestructura para 100k usuarios concurrentes

---

### 21. Retroverse UI Dynamic System

#### 21.1 Objective
Actualizar la interfaz de Retroverse para que sea inteligente y dinámica, mostrando portadas, previews de video o GIFs, información del juego y navegación rápida, todo en tiempo real, sin depender de mockups ni assets estáticos.

#### 21.2 Dynamic Game Dashboard
- Carrusel principal por sistema (NES, SNES, Genesis, GBA, N64, PS1, PS2, Arcade, MSDOS).
- Cada juego debe mostrar:
  - Portada (descargada automáticamente desde Archive.org o fuentes alternativas)
  - Mini-video o GIF preview (si disponible)
  - Título y año
  - Botones “Jugar” e “Invitar amigos”
  - Estado de compatibilidad (compatible / unstable / oculto)
- Carrusel inteligente: prioriza juegos populares, recientes o destacados según la interacción del usuario.
- Preloading dinámico: carga portadas y previews de juegos cercanos al viewport para minimizar latencia visual.

#### 21.3 Game Metadata Integration
Extraer en tiempo real:
- Portada (`cover_url`)
- Video o GIF preview (`video_preview_url`) si existe
- Año, publisher, jugadores, descripción
- Si no hay video, generar automáticamente GIF de gameplay desde la ROM para preview.
- Actualización automática de metadata cada vez que se indexa un nuevo título en Archive.org.

#### 21.4 Dynamic Library UI
- Carruseles horizontales y verticales según dispositivo.
- Filtros inteligentes: Sistema, Género, Multiplayer, Ranking, Favoritos.
- Overlay de información dinámico al hacer hover o click:
  - Video/GIF preview
  - Descripción y controles
  - Estado de compatibilidad
  - Botones de acción rápidos

#### 21.5 Torneos & Multiplayer
- Panel lateral dinámico que se actualiza con torneos activos y partidas de amigos.
- Banners de torneos con mini-preview en tiempo real de partidas recientes.
- Inscripción, visualización de leaderboard y partidas recientes sin refresco de página.

#### 21.6 Performance & Responsiveness
- Lazy load de portadas y previews.
- Preload inteligente de juegos próximos en carrusel.
- WebGL / Canvas para animaciones fluidas.
- Mantener 60fps en desktop y mínimo 30fps en mobile/TV.
- Layout adaptativo para:
  - Desktop: carruseles horizontales grandes
  - Tablet: carruseles y scroll vertical
  - Mobile: scroll vertical touch-optimized
  - Smart TV: navegación remota / gamepad

#### 21.7 Input & Navigation
- Navegación unificada: Teclado, Gamepad (detectar automáticamente tipo de controlador), Touch overlay.
- Acciones rápidas: Selección de juego, Inicio de partida, Invitación a amigo.
- Carruseles y overlays responden a input predictivo para minimizar delay percibido.

#### 21.8 Integration with Library System
- Extrae automáticamente todos los juegos indexados en la librería dinámica.
- Portadas y previews se generan y actualizan en tiempo real desde Archive.org y otras fuentes compatibles.
- El frontend respeta los estados de compatibilidad:
  - `compatible` y `untested` visibles
  - `unstable` con aviso
  - `broken` ocultos automáticamente
- Todo se renderiza sobre la PWA existente sin modificar la lógica de emulación ni validación de ROMs.

#### 21.9 Auto-Update & Self-Healing
- Cada vez que se detecta un nuevo juego:
  - Descargar portada y video/GIF
  - Normalizar metadatos
  - Insertar en carruseles automáticamente
- Fallback automático si portada o preview no existe:
  - Mostrar placeholder genérico + generación de GIF automático desde ROM
- No interrumpe navegación del usuario.

#### 21.10 UI Success Criteria
- Todos los juegos muestran portada y preview dinámicamente.
- Navegación intuitiva y responsive en todos los dispositivos.
- Carruseles y overlays actualizan en tiempo real sin recarga de página.
- Integración perfecta con launcher y multiplayer.
- La biblioteca se siente como una consola real, no como un sitio web de minijuegos.
- Sistema completamente inteligente y escalable para decenas de miles de títulos.
