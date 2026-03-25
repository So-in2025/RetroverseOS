# RETROVERSE – GAME COMPATIBILITY TESTING SYSTEM (GCTS)

## 1. Objetivo

Construir un sistema automatizado capaz de:
- Testear cada ROM del catálogo Retroverse.
- Verificar compatibilidad con el emulador correspondiente.
- Detectar errores de ejecución: crash, freeze, audio/video corrupto.
- Clasificar juegos en `compatible`, `unstable`, `broken`, `untested`.
- Registrar métricas y resultados para alimentar el Compatibility Engine.
- Aplicar fallbacks automáticos en caso de error para minimizar juegos rotos en la plataforma.

**Meta:** validar decenas de miles de títulos con mínima intervención humana y mantener tasa de fallo <3%.

---

## 2. Arquitectura General

```text
GCTS Controller
│
├─ Test Queue Manager
│
├─ Game Runtime Sandbox (WebAssembly + WebGL)
│     ├─ Emulator Core Instance
│     └─ ROM Loader
│
├─ Metrics & Telemetry Collector
│
├─ Error Handler & Recovery System
│
└─ Compatibility Database Updater
```

### Componentes

**1. Test Queue Manager**
- Maneja lista de ROMs pendientes de prueba.
- Prioriza por sistema, tamaño y fecha de agregación.
- Permite reintentos automáticos para ROMs fallidas.

**2. Game Runtime Sandbox**
- Contenedor aislado por juego.
- Ejecuta cada ROM en WebAssembly + WebGL.
- Limita uso de CPU y memoria.
- Protege el hilo principal del navegador.

**3. Metrics & Telemetry Collector**
- Registra: FPS, crashes, audio/video errors, duración de test, tiempos de carga.
- Logs guardados en base de datos para análisis de compatibilidad.

**4. Error Handler & Recovery System**
- Detecta fallos de ejecución.
- Aplica estrategias de recuperación:
  - Reintento de carga ROM
  - Reasignación de emulator core alternativo
  - Limpieza de cache temporal
  - Revalidación de metadata
- Si todas fallan → marca como `broken`.

**5. Compatibility Database Updater**
- Actualiza estado del juego en Compatibility Engine:
  - `compatible` → pasa test sin errores
  - `unstable` → errores intermitentes
  - `broken` → falla crítica
  - `untested` → aún no evaluado

---

## 3. Flujo de Testing

1. GCTS recibe lista de ROMs del Library Service.
2. ROM cargada en Game Runtime Sandbox.
3. Se ejecuta un test automatizado de tiempo limitado (configurable, ejemplo 30s).
4. Durante la ejecución:
   - Se registra FPS mínimo, máximo y promedio.
   - Se verifica audio y video (buffer no vacío, frames renderizados).
   - Se detectan errores de crash, freeze o inputs no aplicables.
5. Si ROM falla:
   - Se aplica Error Recovery System.
   - Se reintenta hasta 3 veces.
6. Resultado registrado en Compatibility Database.
7. Frontend solo muestra juegos `compatible` o `untested`.

---

## 4. Estrategias de Error y Fallback

- **ROM corrupta** → reintento descarga.
- **Emulador incompatible** → prueba core alternativo (si aplica).
- **Header o checksum inválido** → intenta corrección automática o marca `broken`.
- **Freeze o crash** → rollback a estado inicial y reintento.

---

## 5. Sandbox de Ejecución

Cada juego corre aislado en un iframe seguro o Web Worker.

**Políticas de seguridad:**
- CSP (Content Security Policy) estricta.
- Bloqueo de ejecución de código externo.

**Limitación de recursos:**
- Max CPU: configurable según dispositivo.
- Memoria: limitada para prevenir leaks.

---

## 6. Métricas Relevantes

- Tiempo de carga inicial
- FPS promedio, mínimo, máximo
- Crash count
- Audio buffer error
- Video buffer error
- Estado final: `compatible` / `unstable` / `broken`
- Reintentos realizados
- Emulator core usado

---

## 7. Escalabilidad y Paralelización

- Cada sandbox puede correr en hilos independientes (Web Workers).
- Sistema escalable horizontalmente:
  - Multiple workers simultáneos
  - División por sistema: NES, SNES, Genesis, GBA, etc.
- Permite testeo de 10k+ ROMs en paralelo según infraestructura.

---

## 8. Actualización Automática

- El Library Update System dispara el GCTS automáticamente cada 24h.
- Solo se prueban nuevas ROMs o juegos que cambien de estado.
- Resultados alimentan Compatibility Engine, que a su vez ajusta el frontend.

---

## 9. Reportes y Logs

Generación de logs por juego y sesión.
Dashboard interno para QA:
- Total ROMs probadas
- Compatible / unstable / broken
- Rendimiento promedio por core

Alertas automáticas para títulos con fallos repetidos.

---

## 10. Consideraciones de UX

- Frontend nunca muestra juegos `broken`.
- Juegos `unstable` muestran advertencia: “puede presentar fallos en algunos dispositivos”.
- Juegos `compatible` listos para jugar al instante.
- Testeo invisible para el usuario final, no impacta la experiencia.

---

## 11. Seguridad

- Sandbox estricto para evitar ejecución maliciosa.
- Validación de ROM antes de ejecución.
- No se permite ejecución de código descargado de terceros fuera de emulador WASM.
- Prevención de DoS interno: limitación de concurrencia por usuario/core.

---

## 12. Criterios de Éxito

Un juego se considera funcional si:
- Arranca en <5s.
- Mantiene FPS estable según target: Desktop 60fps / Mobile 30fps.
- No crashea durante 30s de ejecución automática.
- Estado `compatible` reflejado en Compatibility Engine.
