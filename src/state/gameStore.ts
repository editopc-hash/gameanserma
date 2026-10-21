import { create } from "zustand";

export type AnimationState = "idle" | "walk" | "run" | "win" | "dead";

export const START_POS: [number, number, number] = [0, 0, -94]; // Parque Principal Anserma
export const GOAL_POS: [number, number, number] = [0, 0, 95];   // Colegio de Occidente

type GameStore = {
  isGameMode: boolean;
  setIsGameMode: (isGameMode: boolean) => void;
  currentAnimation: AnimationState;
  setCurrentAnimation: (anim: AnimationState) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  resetPlayerPos: boolean;
  triggerResetPlayerPos: () => void;
  gameWon: boolean;
  setGameWon: (won: boolean) => void;
  distanceToGoal: number;
  setDistanceToGoal: (d: number) => void;
  progressPercent: number;
  setProgressPercent: (p: number) => void;

  // Mobile Touch Controls
  touchMove: { x: number; y: number };
  setTouchMove: (move: { x: number; y: number }) => void;
  touchRunning: boolean;
  setTouchRunning: (running: boolean) => void;
  triggerAction: "win" | "dead" | null;
  setTriggerAction: (action: "win" | "dead" | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  isGameMode: true,
  setIsGameMode: (isGameMode) => set({ isGameMode }),
  currentAnimation: "idle",
  setCurrentAnimation: (currentAnimation) => set({ currentAnimation }),
  speed: 0,
  setSpeed: (speed) => set({ speed }),
  resetPlayerPos: false,
  triggerResetPlayerPos: () =>
    set((state) => ({ resetPlayerPos: !state.resetPlayerPos, gameWon: false })),
  gameWon: false,
  setGameWon: (gameWon) => set({ gameWon }),
  distanceToGoal: 190,
  setDistanceToGoal: (distanceToGoal) => set({ distanceToGoal }),
  progressPercent: 0,
  setProgressPercent: (progressPercent) => set({ progressPercent }),

  // Mobile Touch Controls
  touchMove: { x: 0, y: 0 },
  setTouchMove: (touchMove) => set({ touchMove }),
  touchRunning: false,
  setTouchRunning: (touchRunning) => set({ touchRunning }),
  triggerAction: null,
  setTriggerAction: (triggerAction) => set({ triggerAction }),
}));
