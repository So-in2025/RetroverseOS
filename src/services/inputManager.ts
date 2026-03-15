export type RetroButton = 
  | 'up' | 'down' | 'left' | 'right' 
  | 'a' | 'b' | 'x' | 'y' 
  | 'start' | 'select' 
  | 'l' | 'r';

type InputHandler = (button: RetroButton, isPressed: boolean) => void;

import { storage } from './storage';

export class InputManager {
  private handlers: Set<InputHandler> = new Set();
  private keyMap: Record<string, RetroButton> = {
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'z': 'a',
    'x': 'b',
    'a': 'y',
    's': 'x',
    'Enter': 'start',
    'Shift': 'select',
    'q': 'l',
    'w': 'r'
  };

  // Standard Gamepad API mapping (Xbox style)
  private gamepadMap: Record<number, RetroButton> = {
    12: 'up',    // D-pad Up
    13: 'down',  // D-pad Down
    14: 'left',  // D-pad Left
    15: 'right', // D-pad Right
    0: 'b',      // A button (Xbox) -> Retro B
    1: 'a',      // B button (Xbox) -> Retro A
    2: 'y',      // X button (Xbox) -> Retro Y
    3: 'x',      // Y button (Xbox) -> Retro X
    9: 'start',  // Start/Menu
    8: 'select', // Select/View
    4: 'l',      // LB
    5: 'r'       // RB
  };

  private buttonStates: Record<RetroButton, boolean> = {
    up: false, down: false, left: false, right: false,
    a: false, b: false, x: false, y: false,
    start: false, select: false, l: false, r: false
  };

  private gamepadState: Record<number, boolean> = {};
  private pollingFrame: number | null = null;
  private isListening: boolean = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.pollGamepads = this.pollGamepads.bind(this);
    this.loadMappings();
  }

  public async loadMappings() {
    const savedGamepad = await storage.getSetting('gamepad_mapping');
    if (savedGamepad) {
      this.gamepadMap = savedGamepad;
    }
    const savedKeys = await storage.getSetting('controls');
    if (savedKeys) {
      // Reverse map from savedKeys (which is { up: 'ArrowUp', ... }) to keyMap
      const newKeyMap: Record<string, RetroButton> = {};
      for (const [retroBtn, key] of Object.entries(savedKeys)) {
        newKeyMap[key as string] = retroBtn as RetroButton;
      }
      this.keyMap = newKeyMap;
    }
  }

  public updateGamepadMapping(mapping: Record<number, RetroButton>) {
    this.gamepadMap = mapping;
    storage.saveSetting('gamepad_mapping', mapping);
  }

  public updateKeyMapping(mapping: Record<string, string>) {
    const newKeyMap: Record<string, RetroButton> = {};
    for (const [retroBtn, key] of Object.entries(mapping)) {
      newKeyMap[key] = retroBtn as RetroButton;
    }
    this.keyMap = newKeyMap;
    storage.saveSetting('controls', mapping);
  }

  public start() {
    if (this.isListening) return;
    
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp, { passive: false });
    
    this.pollingFrame = requestAnimationFrame(this.pollGamepads);
    this.isListening = true;
    console.log('[InputManager] Started listening for inputs.');
  }

  public stop() {
    if (!this.isListening) return;
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    if (this.pollingFrame) {
      cancelAnimationFrame(this.pollingFrame);
      this.pollingFrame = null;
    }
    this.isListening = false;
    console.log('[InputManager] Stopped listening for inputs.');
  }

  public onInput(handler: InputHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // Permite inyectar inputs virtuales (ej. desde controles táctiles)
  public injectInput(button: RetroButton, isPressed: boolean) {
    this.updateButtonState(button, isPressed);
  }

  private handleKeyDown(e: KeyboardEvent) {
    const button = this.keyMap[e.key];
    if (button) {
      // Prevenir scroll con las flechas
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.updateButtonState(button, true);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const button = this.keyMap[e.key];
    if (button) {
      this.updateButtonState(button, false);
    }
  }

  private pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp) continue;

      // Mapeo de botones
      gp.buttons.forEach((btn, index) => {
        const retroBtn = this.gamepadMap[index];
        if (retroBtn) {
          const isPressed = btn.pressed;
          if (this.gamepadState[index] !== isPressed) {
            this.gamepadState[index] = isPressed;
            this.updateButtonState(retroBtn, isPressed);
          }
        }
      });

      // Mapeo de D-Pad analógico (Sticks) a digital
      const threshold = 0.5;
      const xAxis = gp.axes[0];
      const yAxis = gp.axes[1];

      this.handleAxis('left', xAxis < -threshold);
      this.handleAxis('right', xAxis > threshold);
      this.handleAxis('up', yAxis < -threshold);
      this.handleAxis('down', yAxis > threshold);
    }

    this.pollingFrame = requestAnimationFrame(this.pollGamepads);
  }

  private handleAxis(button: RetroButton, isPressed: boolean) {
    // Solo disparamos si el estado cambió
    if (this.buttonStates[button] !== isPressed) {
      this.updateButtonState(button, isPressed);
    }
  }

  private updateButtonState(button: RetroButton, isPressed: boolean) {
    if (this.buttonStates[button] === isPressed) return; // Evitar spam
    
    this.buttonStates[button] = isPressed;
    this.handlers.forEach(handler => handler(button, isPressed));
  }
}

export const inputManager = new InputManager();
