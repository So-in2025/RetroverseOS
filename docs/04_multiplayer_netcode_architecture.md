# MULTIPLAYER NETCODE ARCHITECTURE
## Retro Console PWA Platform
### Technical Blueprint – Omega Level

### 1. Multiplayer Vision
El objetivo es permitir que juegos originalmente diseñados para multiplayer local puedan jugarse online entre usuarios remotos.

**Ejemplos:**
Sonic the Hedgehog 2 VS mode
Street Fighter II
Mortal Kombat
Contra coop

Estos juegos originalmente esperan dos controles conectados a la misma consola.
El sistema multiplayer debe simular exactamente ese escenario.

**Arquitectura conceptual:**
Jugador A → emulador
Jugador B → emulador
Ambos emuladores corren el mismo estado del juego.
Solo se transmiten inputs de control.
Nunca video.

### 2. Core Networking Model
**Modelo principal:**
Input Synchronization Model

Cada jugador envía:
```
frame_number
controller_state
timestamp
```

**Ejemplo:**
```
Frame 10234
Player1: Right + Jump
Player2: Punch
```
El emulador aplica ambos inputs en el mismo frame.
Esto mantiene sincronía perfecta.

### 3. Rollback Netcode System
Para evitar lag perceptible se implementa:
**Rollback Netcode.**

**Funcionamiento:**
Cada cliente predice input remoto
El juego sigue corriendo
Cuando llega el input real:
Si no coincide → rollback

**Proceso técnico:**
```
Save state buffer
↓
Prediction frame
↓
Receive real input
↓
Mismatch?
↓
Rollback N frames
↓
Re-simulate frames
```

**Requisitos del emulador:**
Save states ultra rápidos
Re-simulación determinista

Esto es posible con emuladores tipo:
Genesis cores
SNES cores
NES cores

### 4. Networking Layer
**Tecnología principal:**
WebRTC

**Motivo:**
P2P
baja latencia
ideal para navegador

**Conexión:**
```
Player A
   ↕
Signaling Server
   ↕
Player B
```
Una vez conectados:
P2P directo.
El servidor solo coordina.

### 5. Signaling Infrastructure
**Backend:**
Node / Edge Functions

**Funciones:**
lobby matchmaking
intercambio de SDP
NAT traversal
STUN/TURN fallback

**Servicios:**
STUN → conexión directa
TURN → relay si falla NAT

**Flujo:**
```
create_match()
join_match()
exchange_webrtc_keys()
connect_peers()
start_game()
```

### 6. Deterministic Emulator Requirement
Para multiplayer el emulador debe ser determinista.

**Significa:**
Si el mismo ROM recibe los mismos inputs → siempre produce el mismo resultado.
Esto es esencial.

Por eso cores ideales:
Sega Genesis
NES
SNES

Más complejos:
N64
PS1
PS2
Estos requieren optimización extra.

### 7. State Synchronization System
Cada cliente mantiene:
```
State buffer = last 8 frames
```

**Ejemplo:**
```
Frame 1001
Frame 1002
Frame 1003
Frame 1004
Frame 1005
Frame 1006
Frame 1007
Frame 1008
```
Si hay error:
Rollback hasta frame válido.

### 8. Latency Compensation
**Técnicas usadas:**
Input delay buffer

**Ejemplo:**
```
delay = 2 frames
```
El juego corre ligeramente retrasado para absorber latencia.
Configuración dinámica según ping.

### 9. Matchmaking System
**Tipos de juego:**
Quick Match
Friend Invite
Private Room
Tournament Match

**Flujo típico:**
```
User selects game
↓
Click multiplayer
↓
Create lobby
↓
Invite friend
↓
Start match
```

### 10. Multiplayer Lobby UX
UI estilo consola moderna.

**Pantalla lobby:**
Players:
```
Player 1
Ready

Player 2
Connecting...
```

Chat rápido:
Ready?
Go!
Rematch

### 11. Spectator Mode (fase 2)
Permite ver partidas en vivo.

**Modo:**
Host stream state frames.
Los espectadores sincronizan.

Ideal para:
Torneos.

### 12. Tournament Infrastructure
Sistema competitivo integrado.

**Tipos:**
Daily Tournaments
Weekly League
Community Cups

**Ejemplo:**
```
Street Fighter II Championship
64 players
Single elimination
Leaderboard global.
```

### 13. Save Replay System
Cada partida guarda:
```
ROM hash
input stream
timestamp
```
Replay reproduce partida completa.
Peso mínimo.

### 14. Security and Anti-Cheat
**Validaciones:**
ROM hash verification
Evita versiones modificadas.

Input rate validation
Evita macros.

### 15. Performance Targets
Latency ideal:
<40ms

Rollback tolerable:
<6 frames

Bandwidth requerido:
<30kbps
Extremadamente liviano.

### 16. Roadmap Multiplayer
Fase 1
Genesis / NES multiplayer

Fase 2
SNES rollback

Fase 3
Arcade cores

Fase 4
PS1 online

Fase 5
Cross-device multiplayer
