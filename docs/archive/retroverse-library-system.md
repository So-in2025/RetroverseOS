# RETROVERSE

## Universal Game Library System
### Final Implementation Specification

### 1. Objective
Construir un sistema de biblioteca universal de videojuegos retro capaz de:
- indexar automáticamente el catálogo público disponible en Archive.org
- normalizar metadatos inconsistentes
- lanzar juegos en navegador mediante emulación WebAssembly
- implementar validación y fallback automático para evitar fallos de ejecución
- escalar a decenas de miles de títulos

El sistema debe ser auto-reparable, auto-actualizable y tolerante a fallos.

### 2. High Level Architecture
Retroverse se compone de cinco subsistemas principales.

Retroverse Frontend
↓
Library Service
↓
Metadata Database
↓
ROM Fetch Service
↓
Emulation Engine Manager

Componentes auxiliares:
- Compatibility Engine
- ROM Validator
- Cache Layer
- Error Recovery System
- Telemetry System

### 3. Archive.org Catalog Integration
El sistema debe indexar automáticamente las colecciones públicas relevantes.

Fuentes iniciales obligatorias:
- softwarelibrary_nes
- softwarelibrary_snes
- softwarelibrary_sega_genesis
- softwarelibrary_gameboy
- softwarelibrary_gameboyadvance
- softwarelibrary_msdos
- softwarelibrary_arcade

Consulta base:
https://archive.org/advancedsearch.php?q=collection:(softwarelibrary_nes)&fl[]=identifier,title,description,creator,date&rows=500&page=1&output=json

El sistema debe:
1. recorrer todas las páginas
2. extraer metadatos
3. localizar archivos ROM válidos

Extensiones soportadas:
- NES: .nes
- SNES: .smc, .sfc
- Genesis: .gen, .bin
- Gameboy: .gb
- Gameboy Advance: .gba
- Arcade: .zip
- MSDOS: .zip, .jsdos

### 4. Metadata Normalization Engine
Archive contiene datos inconsistentes.
El sistema debe crear un modelo interno uniforme.

Game Object Schema:
- game_id
- title
- system
- year
- publisher
- players
- rom_url
- cover_url
- rom_size
- emulator_core
- compatibility_status
- checksum

Normalización obligatoria:
- Eliminar duplicados
- Corregir títulos
- Asignar sistema correcto
- Verificar ROM principal

### 5. Emulator Core System
Cada sistema utiliza un core WASM optimizado.

Cores recomendados:
- NES: FCEUmm WASM
- SNES: Snes9x WASM
- Genesis: Genesis Plus GX WASM
- Gameboy: Gambatte WASM
- GBA: mGBA WASM
- Arcade: FinalBurn Neo WASM
- MSDOS: DOSBox WASM

Cada core se ejecuta dentro de:
GameRuntimeContainer
que maneja:
- input mapping
- audio
- video buffer
- save states

### 6. Game Launch Pipeline
Flujo de ejecución obligatorio.

User clicks Play
↓
Library Service obtiene metadata
↓
Compatibility Engine valida soporte
↓
ROM Fetch Service descarga ROM
↓
ROM Validator verifica integridad
↓
ROM → ArrayBuffer
↓
Engine Manager carga emulator core
↓
ROM montada en virtual filesystem
↓
Emulator boot

Si falla algún paso → se activa recuperación automática.

### 7. ROM Validation System
Antes de lanzar cualquier juego se ejecutan verificaciones.

Checks obligatorios:
- file exists
- file size > 0
- checksum verification
- valid extension
- header integrity

Ejemplo checksum:
- CRC32
- MD5

Si falla:
marcar juego como
compatibility_status = broken
y evitar mostrar botón Play.

### 8. Compatibility Engine
El sistema aprende qué juegos funcionan.

Estados posibles:
- compatible
- unstable
- broken
- untested

Si un juego falla más de 3 veces en ejecución:
estado → unstable

Si falla en inicialización:
estado → broken

El frontend debe ocultar juegos broken automáticamente.

### 9. ROM Fetch System
La ROM nunca se almacena permanentemente en servidor.
Se descarga directamente desde Archive.

Proceso:
- fetch
- stream
- buffer
- load into emulator

Cache local opcional.
Cache Layer: IndexedDB
Política de cache: max size 2GB, LRU eviction

### 10. Error Recovery System
El sistema debe implementar fallback automático.

Posibles fallos:
- ROM corrupta
- emulador incompatible
- ROM comprimida incorrectamente
- archivo incorrecto

Estrategias:
- reintento descarga
- cambiar core alternativo
- releer metadata
- limpiar cache local

Si todas fallan:
marcar juego incompatible.

### 11. Performance Optimization
Medidas obligatorias.
- ROM streaming
- lazy loading de emulator cores
- Web Workers para emulación
- frame skipping automático en móviles

Target performance:
- 60fps desktop
- 30fps mobile mínimo

### 12. Input System
Soporte obligatorio.
- Keyboard
- Gamepad API
- Touch overlay

Mapeo estándar:
- NES layout
- SNES layout
- Genesis layout

Detección automática de gamepad.

### 13. Save System
Sistema de guardado universal.

Tipos soportados:
- save states
- battery saves

Almacenamiento: IndexedDB
Guardado automático cada 30 segundos.

### 14. Multiplayer Future Support
Arquitectura preparada para netplay.

Interfaz: NetplayAdapter

Protocolos posibles:
- WebRTC
- Rollback netcode

Implementación diferida.

### 15. Telemetry System
Recolectar datos para mejorar compatibilidad.

Eventos registrados:
- game launch success
- game launch failure
- fps metrics
- core crashes

Estos datos alimentan el Compatibility Engine.

### 16. Library Update System
El indexador debe ejecutarse periódicamente.

Frecuencia recomendada: cada 24 horas.

Proceso:
- scan collections
- detect new titles
- normalize metadata
- insert into database

### 17. User Experience Rules
Mostrar solo juegos: compatible, untested
Ocultar automáticamente: broken
Mostrar advertencia para: unstable

### 18. Security Measures
Prevenir ejecución maliciosa.
Sandbox obligatorio para emuladores.

Usar:
- iframe isolation
- CSP policies
- ROM validation

Nunca ejecutar código externo directo.

### 19. Scalability Targets
Objetivo inicial: 5,000 juegos jugables
Objetivo escalado: 20,000+ juegos indexados
Infraestructura preparada para: 100k usuarios concurrentes

### 20. Success Criteria
Un juego se considera funcional si:
- arranca en < 5 segundos
- mantiene framerate estable
- no crashea en 10 minutos de juego

Tasa de fallo objetivo: < 3%

---
Contexto rápido de ingeniería
La razón por la que este sistema funciona es que no estás creando un catálogo manual, estás creando un motor de descubrimiento y normalización. Esa diferencia cambia todo. Archive es como una biblioteca cósmica medio caótica; tu plataforma es el bibliotecario obsesivo que etiqueta, ordena y presenta los libros correctos.

También conviene ser honesto con la física del asunto. Emular máquinas antiguas en navegador es sorprendentemente viable porque esas consolas corrían a frecuencias ridículas comparadas con un teléfono moderno. Un NES funciona a ~1.79 MHz. Un celular barato hoy opera miles de veces más rápido. Por eso el truco real no es potencia, es ingeniería de compatibilidad y manejo de errores.

Si querés llevar esta plataforma al siguiente nivel, el siguiente documento que conviene crear es uno que casi nadie piensa al principio:
GAME COMPATIBILITY TESTING SYSTEM
Eso permite probar automáticamente miles de ROMs y detectar cuáles arrancan, cuáles crashean y cuáles requieren configuraciones especiales. Las plataformas de emulación grandes viven o mueren por ese tipo de automatización.
