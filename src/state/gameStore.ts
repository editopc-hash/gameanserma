import { create } from "zustand";

export type AnimationState = "idle" | "walk" | "run" | "win" | "dead";

export const START_POS: [number, number, number] = [0, 0, -94]; // Parque Principal Anserma
export const GOAL_POS: [number, number, number] = [0, 0, 95];   // Colegio de Occidente

export interface LeaderboardEntry {
  name: string;
  time: number; // seconds
  date: string;
}

const DEFAULT_SCHOOL_RECORDS: LeaderboardEntry[] = [
  { name: "Mateo_Anserma", time: 48.2, date: "2026-10-20" },
  { name: "Camila_Runner", time: 54.8, date: "2026-10-20" },
  { name: "ProGamer_Caldas", time: 63.5, date: "2026-10-20" },
];

const DEFAULT_SUSANA_RECORDS: LeaderboardEntry[] = [
  { name: "Explorador_3D", time: 24.1, date: "2026-10-20" },
  { name: "Sofia_Blender", time: 31.6, date: "2026-10-20" },
  { name: "Don_Oscar", time: 42.0, date: "2026-10-20" },
];

export function getLeaderboard(key: string, defaults: LeaderboardEntry[]): LeaderboardEntry[] {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function saveLeaderboard(key: string, list: LeaderboardEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.error("Error saving leaderboard", e);
  }
}

export function addRecord(key: string, defaults: LeaderboardEntry[], name: string, time: number): { list: LeaderboardEntry[]; rank: number } {
  const current = getLeaderboard(key, defaults);
  const now = new Date().toISOString().split("T")[0];
  const updated = [...current, { name: name.trim() || "Jugador", time: Number(time.toFixed(1)), date: now }];
  updated.sort((a, b) => a.time - b.time);
  const topList = updated.slice(0, 10);
  saveLeaderboard(key, topList);
  const rank = topList.findIndex((item) => item.name === (name.trim() || "Jugador") && Math.abs(item.time - time) < 0.1) + 1;
  return { list: topList, rank: rank > 0 ? rank : 999 };
}

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

  // Player Name & Game Start Flow
  playerName: string;
  setPlayerName: (name: string) => void;
  gameStarted: boolean;
  setGameStarted: (started: boolean) => void;
  isPlayingIntro: boolean;
  setIsPlayingIntro: (playing: boolean) => void;
  startTime: number | null;
  setStartTime: (time: number | null) => void;
  timeElapsed: number;
  setTimeElapsed: (time: number) => void;
  susanaTime: number | null;
  setSusanaTime: (time: number | null) => void;
  schoolTime: number | null;
  setSchoolTime: (time: number | null) => void;
  showLeaderboardModal: boolean;
  setShowLeaderboardModal: (show: boolean) => void;

  // Mobile Touch Controls
  touchMove: { x: number; y: number };
  setTouchMove: (move: { x: number; y: number }) => void;
  touchRunning: boolean;
  setTouchRunning: (running: boolean) => void;
  triggerAction: "win" | "dead" | null;
  setTriggerAction: (action: "win" | "dead" | null) => void;

  // Zusana Easter Egg: Zusana (Blender Suzanne Monkey)
  foundSuzanne: boolean;
  setFoundSuzanne: (found: boolean) => void;
  showSuzanneModal: boolean;
  setShowSuzanneModal: (show: boolean) => void;
  suzannePos: [number, number, number] | null;
  setSuzannePos: (pos: [number, number, number] | null) => void;

  // Camera Distance / Zoom
  cameraDistance: number;
  setCameraDistance: (dist: number) => void;
  toggleCameraDistance: () => void;

  // Performance / Optimization Mode (removes shadows, reflections, lowers dpr)
  performanceMode: boolean;
  togglePerformanceMode: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  isGameMode: true,
  setIsGameMode: (isGameMode) => set({ isGameMode }),
  currentAnimation: "idle",
  setCurrentAnimation: (currentAnimation) => set({ currentAnimation }),
  speed: 0,
  setSpeed: (speed) => set({ speed }),
  resetPlayerPos: false,
  triggerResetPlayerPos: () =>
    set((state) => ({
      resetPlayerPos: !state.resetPlayerPos,
      gameWon: false,
      foundSuzanne: false,
      showSuzanneModal: false,
      startTime: Date.now(),
      timeElapsed: 0,
      susanaTime: null,
      schoolTime: null,
    })),
  gameWon: false,
  setGameWon: (gameWon) => {
    const state = get();
    if (gameWon && !state.gameWon) {
      const now = Date.now();
      const elapsed = state.startTime ? (now - state.startTime) / 1000 : state.timeElapsed;
      addRecord("anserma_school_leaderboard", DEFAULT_SCHOOL_RECORDS, state.playerName, elapsed);
      set({ gameWon: true, schoolTime: elapsed });
    } else {
      set({ gameWon });
    }
  },
  distanceToGoal: 190,
  setDistanceToGoal: (distanceToGoal) => set({ distanceToGoal }),
  progressPercent: 0,
  setProgressPercent: (progressPercent) => set({ progressPercent }),

  // Player & Game Flow
  playerName: typeof window !== "undefined" ? (localStorage.getItem("anserma_player_name") || "") : "",
  setPlayerName: (playerName) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("anserma_player_name", playerName);
    }
    set({ playerName });
  },
  gameStarted: false,
  setGameStarted: (gameStarted) => set({ gameStarted }),
  isPlayingIntro: false,
  setIsPlayingIntro: (isPlayingIntro) => set({ isPlayingIntro }),
  startTime: null,
  setStartTime: (startTime) => set({ startTime }),
  timeElapsed: 0,
  setTimeElapsed: (timeElapsed) => set({ timeElapsed }),
  susanaTime: null,
  setSusanaTime: (susanaTime) => set({ susanaTime }),
  schoolTime: null,
  setSchoolTime: (schoolTime) => set({ schoolTime }),
  showLeaderboardModal: false,
  setShowLeaderboardModal: (showLeaderboardModal) => set({ showLeaderboardModal }),

  // Mobile Touch Controls
  touchMove: { x: 0, y: 0 },
  setTouchMove: (touchMove) => set({ touchMove }),
  touchRunning: false,
  setTouchRunning: (touchRunning) => set({ touchRunning }),
  triggerAction: null,
  setTriggerAction: (triggerAction) => set({ triggerAction }),

  // Zusana Easter Egg
  foundSuzanne: false,
  setFoundSuzanne: (foundSuzanne) => {
    const state = get();
    if (foundSuzanne && !state.foundSuzanne) {
      const now = Date.now();
      const elapsed = state.startTime ? (now - state.startTime) / 1000 : state.timeElapsed;
      addRecord("anserma_susana_leaderboard", DEFAULT_SUSANA_RECORDS, state.playerName, elapsed);
      set({ foundSuzanne: true, susanaTime: elapsed, showSuzanneModal: true });
    } else {
      set({ foundSuzanne });
    }
  },
  showSuzanneModal: false,
  setShowSuzanneModal: (showSuzanneModal) => set({ showSuzanneModal }),
  suzannePos: null,
  setSuzannePos: (suzannePos) => set({ suzannePos }),

  // Camera Distance: default 1.65m for very close, immersive perspective (0.8m to 7.5m range)
  cameraDistance: 1.65,
  setCameraDistance: (cameraDistance) =>
    set({ cameraDistance: Math.max(0.8, Math.min(7.5, Number(cameraDistance.toFixed(2)))) }),
  toggleCameraDistance: () =>
    set((state) => ({
      cameraDistance: state.cameraDistance < 2.0 ? 2.8 : state.cameraDistance < 3.8 ? 4.8 : 1.65,
    })),

  // Performance / Optimization Mode
  performanceMode: false,
  togglePerformanceMode: () =>
    set((state) => ({
      performanceMode: !state.performanceMode,
    })),
}));

export { DEFAULT_SCHOOL_RECORDS, DEFAULT_SUSANA_RECORDS };
