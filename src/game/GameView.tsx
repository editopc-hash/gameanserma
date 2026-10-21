import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, Environment } from "@react-three/drei";
import { css } from "@emotion/react";
import { Map } from "./Map";
import { Player } from "./Player";
import { TouchControls } from "./TouchControls";
import { LeaderboardModal } from "./LeaderboardModal";
import { PreloadAndIntroModal } from "./PreloadAndIntroModal";
import {
  useGameStore,
  getLeaderboard,
  DEFAULT_SCHOOL_RECORDS,
  DEFAULT_SUSANA_RECORDS,
} from "@/state/gameStore";
import {
  Gamepad2,
  RotateCcw,
  Compass,
  Sparkles,
  Skull,
  Flame,
  Award,
  Navigation,
  ChevronDown,
  ChevronUp,
  Smile,
  X,
  Trophy,
  Clock,
  User,
} from "lucide-react";

function formatSec(sec: number): string {
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}m ${s}s`;
}

export function GameView() {
  const currentAnimation = useGameStore((s) => s.currentAnimation);
  const speed = useGameStore((s) => s.speed);
  const triggerResetPlayerPos = useGameStore((s) => s.triggerResetPlayerPos);
  const gameWon = useGameStore((s) => s.gameWon);
  const distanceToGoal = useGameStore((s) => s.distanceToGoal);
  const progressPercent = useGameStore((s) => s.progressPercent);

  // Player and speedrun state
  const playerName = useGameStore((s) => s.playerName);
  const gameStarted = useGameStore((s) => s.gameStarted);
  const timeElapsed = useGameStore((s) => s.timeElapsed);
  const schoolTime = useGameStore((s) => s.schoolTime);
  const susanaTime = useGameStore((s) => s.susanaTime);
  const showLeaderboardModal = useGameStore((s) => s.showLeaderboardModal);
  const setShowLeaderboardModal = useGameStore((s) => s.setShowLeaderboardModal);

  // Zusana Easter Egg
  const foundSuzanne = useGameStore((s) => s.foundSuzanne);
  const showSuzanneModal = useGameStore((s) => s.showSuzanneModal);
  const setShowSuzanneModal = useGameStore((s) => s.setShowSuzanneModal);

  // Leaderboard modal tab selection
  const [leaderboardTab, setLeaderboardTab] = useState<"school" | "susana">("school");

  // Temporary start toast: "Parque Principal de Anserma"
  const [showStartToast, setShowStartToast] = useState(false);

  // Responsive mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      setIsMobile(mobile);
      setShowControlsHelp(!mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show "Parque Principal" banner only at start for 5 seconds
  useEffect(() => {
    if (gameStarted) {
      setShowStartToast(true);
      const timer = setTimeout(() => {
        setShowStartToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameStarted]);

  const getStatusBadge = () => {
    if (gameWon) {
      return { label: "¡Victoria! 🎉", icon: "🏆", color: "#facc15" };
    }
    switch (currentAnimation) {
      case "walk":
        return { label: "Caminando", icon: "🚶", color: "#38bdf8" };
      case "run":
        return { label: "Corriendo", icon: "🏃", color: "#f97316" };
      case "win":
        return { label: "¡Celebrando!", icon: "🎉", color: "#eab308" };
      case "dead":
        return { label: "Caído / K.O.", icon: "💀", color: "#ef4444" };
      default:
        return { label: "En espera", icon: "🧍", color: "#10b981" };
    }
  };

  const status = getStatusBadge();

  // Top records preview for modals
  const topSchoolRecords = getLeaderboard("anserma_school_leaderboard", DEFAULT_SCHOOL_RECORDS).slice(0, 3);
  const topSusanaRecords = getLeaderboard("anserma_susana_leaderboard", DEFAULT_SUSANA_RECORDS).slice(0, 3);

  return (
    <div
      css={css({
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#0d1117",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      })}
    >
      {/* 3D Scene - loads silently behind the preloader without any ugly 'Cargando' text */}
      <Canvas
        shadows
        camera={{ position: [0, 5, -88], fov: 60, near: 0.1, far: 2000 }}
        dpr={[1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.75)]}
        gl={{ powerPreference: "high-performance", antialias: true }}
      >
        <fog attach="fog" args={["#cde3f7", 80, 750]} />

        {/* Ambient & sky light */}
        <ambientLight intensity={0.65} />
        <hemisphereLight
          args={["#b1e1ff", "#3a342d", 0.75]}
          position={[0, 50, 0]}
        />

        {/* Primary sunlight with soft shadows */}
        <directionalLight
          castShadow
          position={[120, 160, 90]}
          intensity={2.4}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={600}
          shadow-camera-left={-220}
          shadow-camera-right={220}
          shadow-camera-top={220}
          shadow-camera-bottom={-220}
          shadow-bias={-0.0003}
        />

        {/* Sky dome & city reflections */}
        <Sky
          distance={450000}
          sunPosition={[120, 160, 90]}
          inclination={0.48}
          azimuth={0.25}
          turbidity={8}
          rayleigh={4}
        />
        <Environment preset="city" />

        {/* 3D World - silent background load */}
        <Suspense fallback={null}>
          <Map />
          <Player />
        </Suspense>
      </Canvas>

      {/* Touch Joystick & Action Buttons for Mobile */}
      <TouchControls />

      {/* Top Main HUD - Goal Distance, Remaining Meters, Progress Bar, and Player Timer */}
      <div
        css={css({
          position: "absolute",
          top: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.16)",
          borderRadius: "18px",
          padding: isMobile ? "8px 12px" : "10px 18px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
          width: isMobile ? "94%" : "480px",
          maxWidth: "520px",
          zIndex: 110,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        })}
      >
        {/* Row 1: Objective & Distance Remaining (The original requested indicator) */}
        <div
          css={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: isMobile ? "11px" : "12.5px",
            fontWeight: 600,
          })}
        >
          <div css={css({ display: "flex", alignItems: "center", gap: "6px" })}>
            <Navigation size={13} color="#38bdf8" />
            <span css={css({ color: "#e2e8f0" })}>
              Objetivo: <strong>Colegio de Occidente</strong>
            </span>
          </div>

          <div css={css({ display: "flex", alignItems: "center", gap: "8px" })}>
            {foundSuzanne && (
              <span
                css={css({
                  background: "rgba(245, 158, 11, 0.25)",
                  border: "1px solid #f59e0b",
                  borderRadius: "9999px",
                  padding: "1px 8px",
                  fontSize: "10px",
                  color: "#fcd34d",
                  fontWeight: 700,
                })}
              >
                🐵 Zusana ✓
              </span>
            )}
            <span
              css={css({
                color: "#facc15",
                fontWeight: 800,
                fontSize: isMobile ? "11.5px" : "13px",
              })}
            >
              {distanceToGoal} m restantes
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          css={css({
            width: "100%",
            height: "6px",
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: "4px",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <div
            css={css({
              width: `${progressPercent}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, #38bdf8 0%, #22c55e 70%, #facc15 100%)",
              borderRadius: "4px",
              transition: "width 0.2s ease",
            })}
          />
        </div>

        {/* Sub-row: Parque Principal & Colegio + Participant Name, Stopwatch & Top 3 */}
        <div
          css={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: isMobile ? "10px" : "11px",
            color: "#94a3b8",
          })}
        >
          <span>🌳 Parque Principal</span>

          <div css={css({ display: "flex", alignItems: "center", gap: "8px" })}>
            {playerName && (
              <span css={css({ color: "#38bdf8", fontWeight: 700 })}>
                👤 {playerName}
              </span>
            )}
            <span
              css={css({
                color: "#facc15",
                fontWeight: 700,
                fontFamily: "monospace",
              })}
            >
              ⏱️ {formatSec(timeElapsed)}
            </span>
            <button
              onClick={() => {
                setLeaderboardTab("school");
                setShowLeaderboardModal(true);
              }}
              css={css({
                background: "rgba(250, 204, 21, 0.15)",
                border: "1px solid rgba(250, 204, 21, 0.3)",
                color: "#facc15",
                borderRadius: "6px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: 700,
                cursor: "pointer",
                "&:hover": { background: "rgba(250, 204, 21, 0.25)" },
              })}
            >
              🏆 Top 3
            </button>
          </div>

          <span>🏫 Colegio (Meta)</span>
        </div>
      </div>

      {/* Small floating banner: Parque Principal (Only visible at start, small on mobile, disappears after 5s) */}
      {showStartToast && (
        <div
          css={css({
            position: "absolute",
            top: isMobile ? "5.8rem" : "5.4rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "20px",
            padding: "5px 14px",
            color: "#38bdf8",
            fontSize: isMobile ? "11.5px" : "12.5px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            zIndex: 105,
            animation: "toastFade 0.3s ease",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            "@keyframes toastFade": {
              from: { opacity: 0, transform: "translate(-50%, -6px)" },
              to: { opacity: 1, transform: "translate(-50%, 0)" },
            },
          })}
        >
          <span>📍</span>
          <span>Parque Principal de Anserma (Inicio)</span>
        </div>
      )}

      {/* Floating HUD Controls (Top Left) */}
      <div
        css={css({
          position: "absolute",
          top: isMobile ? "7.8rem" : "4.0rem",
          left: isMobile ? "0.8rem" : "1.5rem",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: showControlsHelp ? "12px 16px" : "8px 12px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.35)",
          maxWidth: isMobile ? "230px" : "300px",
          zIndex: 120,
          transition: "all 0.2s ease",
        })}
      >
        <div
          css={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: showControlsHelp
              ? "1px solid rgba(255,255,255,0.1)"
              : "none",
            paddingBottom: showControlsHelp ? "6px" : "0",
            marginBottom: showControlsHelp ? "8px" : "0",
            gap: "8px",
          })}
        >
          <div
            onClick={() => setShowControlsHelp(!showControlsHelp)}
            css={css({
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            })}
          >
            <Gamepad2 size={15} color="#38bdf8" />
            <span
              css={css({
                fontWeight: 700,
                fontSize: "12px",
                letterSpacing: "0.4px",
              })}
            >
              {isMobile ? "Ayuda" : "Controles"}
            </span>
            {showControlsHelp ? (
              <ChevronUp size={14} color="#94a3b8" />
            ) : (
              <ChevronDown size={14} color="#94a3b8" />
            )}
          </div>

          <button
            onClick={triggerResetPlayerPos}
            title="Reiniciar en el Parque Principal"
            css={css({
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#cbd5e1",
              borderRadius: "6px",
              padding: "3px 7px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              "&:hover": {
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
              },
            })}
          >
            <RotateCcw size={11} /> Reiniciar
          </button>
        </div>

        {showControlsHelp && (
          <div
            css={css({
              display: "flex",
              flexDirection: "column",
              gap: "7px",
              fontSize: "11px",
              color: "#cbd5e1",
            })}
          >
            <div css={css({ display: "flex", justifyContent: "space-between" })}>
              <span>Moverse:</span>
              <span>
                <span css={kbdStyle}>W</span> <span css={kbdStyle}>A</span>{" "}
                <span css={kbdStyle}>S</span> <span css={kbdStyle}>D</span>
              </span>
            </div>
            <div css={css({ display: "flex", justifyContent: "space-between" })}>
              <span>Correr:</span>
              <span>
                <span css={kbdStyle}>Shift</span> sostenido
              </span>
            </div>
            <div css={css({ display: "flex", justifyContent: "space-between" })}>
              <span>Celebrar:</span>
              <span css={kbdStyle}>G</span>
            </div>
            <div css={css({ display: "flex", justifyContent: "space-between" })}>
              <span>Caer (K.O.):</span>
              <span css={kbdStyle}>M</span>
            </div>
            <div
              css={css({
                borderTop: "1px dashed rgba(255,255,255,0.1)",
                paddingTop: "6px",
                color: "#94a3b8",
                fontSize: "10px",
              })}
            >
              {isMobile
                ? "💡 Usa el joystick virtual a la izquierda y desliza la pantalla para rotar la cámara."
                : "💡 Clic y arrastra para orbitar la cámara suavemente alrededor del personaje."}
            </div>
          </div>
        )}
      </div>

      {/* Floating Status Badge */}
      <div
        css={css({
          position: "absolute",
          bottom: isMobile ? "9.5rem" : "1.5rem",
          left: isMobile ? "1rem" : "1.5rem",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: "7px 13px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 110,
        })}
      >
        <span css={css({ fontSize: "16px" })}>{status.icon}</span>
        <div css={css({ display: "flex", flexDirection: "column" })}>
          <span
            css={css({
              fontSize: "9px",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            })}
          >
            Estado
          </span>
          <span
            css={css({
              fontSize: "12px",
              fontWeight: 700,
              color: status.color,
            })}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Zusana Discovery Modal */}
      {showSuzanneModal && (
        <div
          css={css({
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 12000,
            padding: "1rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
          })}
        >
          <div
            css={css({
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "2px solid #f59e0b",
              borderRadius: "24px",
              padding: isMobile ? "22px 18px" : "30px 36px",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(245, 158, 11, 0.35)",
              maxWidth: "460px",
              width: "100%",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            })}
          >
            <div
              css={css({
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(245, 158, 11, 0.6)",
                fontSize: "36px",
              })}
            >
              🐵
            </div>

            <div>
              <h2
                css={css({
                  fontSize: isMobile ? "20px" : "24px",
                  fontWeight: 900,
                  color: "#fbbf24",
                  margin: 0,
                  lineHeight: 1.25,
                })}
              >
                ¡Felicidades, {playerName || "participante"}!
              </h2>
              <h3 css={css({ fontSize: "16px", color: "#facc15", margin: "4px 0 0 0", fontWeight: 700 })}>
                ¡Encontraste a Zusana (mono de Blender)!
              </h3>
              {susanaTime && (
                <div
                  css={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(245, 158, 11, 0.2)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    color: "#fcd34d",
                    fontSize: "13px",
                    fontWeight: 800,
                    margin: "8px 0 0 0",
                  })}
                >
                  <Clock size={13} />
                  <span>Tu tiempo récord: {formatSec(susanaTime)}</span>
                </div>
              )}
            </div>

            {/* Top 3 Zusana Podium Preview */}
            <div
              css={css({
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "14px",
                padding: "10px 14px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              })}
            >
              <span css={css({ fontSize: "11px", fontWeight: 800, color: "#94a3b8" })}>
                🏆 TOP 3 QUIÉN ENCONTRÓ A ZUSANA MÁS RÁPIDO:
              </span>
              {topSusanaRecords.map((rec, i) => (
                <div
                  key={i}
                  css={css({
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: i === 0 ? "#facc15" : i === 1 ? "#e2e8f0" : "#fb923c",
                    fontWeight: 700,
                  })}
                >
                  <span>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {rec.name}
                  </span>
                  <span>{formatSec(rec.time)}</span>
                </div>
              ))}
            </div>

            <div css={css({ display: "flex", gap: "10px", width: "100%" })}>
              <button
                onClick={() => {
                  setShowSuzanneModal(false);
                  setLeaderboardTab("susana");
                  setShowLeaderboardModal(true);
                }}
                css={css({
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                })}
              >
                Ver Clasificación
              </button>
              <button
                onClick={() => setShowSuzanneModal(false)}
                css={css({
                  flex: 1,
                  background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 6px 16px rgba(217, 119, 6, 0.4)",
                })}
              >
                Continuar ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Celebration Modal when reaching the School */}
      {gameWon && (
        <div
          css={css({
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 12000,
            padding: "1rem",
            fontFamily: "system-ui, -apple-system, sans-serif",
          })}
        >
          <div
            css={css({
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "2px solid #facc15",
              borderRadius: "24px",
              padding: isMobile ? "24px 18px" : "36px 40px",
              textAlign: "center",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(250, 204, 21, 0.4)",
              maxWidth: "460px",
              width: "100%",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
            })}
          >
            <div
              css={css({
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 30px rgba(250, 204, 21, 0.6)",
              })}
            >
              <Award size={38} color="#0f172a" />
            </div>

            <div>
              <h2
                css={css({
                  fontSize: isMobile ? "22px" : "26px",
                  fontWeight: 900,
                  color: "#facc15",
                  margin: 0,
                })}
              >
                ¡LLEGASTE AL COLEGIO!
              </h2>
              <p
                css={css({
                  color: "#cbd5e1",
                  fontSize: isMobile ? "12px" : "13.5px",
                  margin: "6px 0 0 0",
                  lineHeight: 1.4,
                })}
              >
                ¡Misión cumplida, <strong>{playerName || "participante"}</strong>! Has completado el recorrido desde el{" "}
                <strong>Parque Principal</strong> hasta el <strong>Colegio de Occidente</strong>.
              </p>
              {schoolTime && (
                <div
                  css={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(56, 189, 248, 0.2)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    padding: "4px 14px",
                    borderRadius: "16px",
                    color: "#38bdf8",
                    fontSize: "14px",
                    fontWeight: 800,
                    margin: "8px 0 0 0",
                  })}
                >
                  <Clock size={14} />
                  <span>Tu tiempo récord: {formatSec(schoolTime)}</span>
                </div>
              )}
            </div>

            {/* Top 3 School Arrival Podium Preview */}
            <div
              css={css({
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                borderRadius: "14px",
                padding: "10px 14px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              })}
            >
              <span css={css({ fontSize: "11px", fontWeight: 800, color: "#94a3b8" })}>
                🏆 TOP 3 LLEGADA MÁS RÁPIDA AL COLEGIO:
              </span>
              {topSchoolRecords.map((rec, i) => (
                <div
                  key={i}
                  css={css({
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    color: i === 0 ? "#facc15" : i === 1 ? "#e2e8f0" : "#fb923c",
                    fontWeight: 700,
                  })}
                >
                  <span>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {rec.name}
                  </span>
                  <span>{formatSec(rec.time)}</span>
                </div>
              ))}
            </div>

            <div css={css({ display: "flex", gap: "10px", width: "100%" })}>
              <button
                onClick={() => {
                  setLeaderboardTab("school");
                  setShowLeaderboardModal(true);
                }}
                css={css({
                  flex: 1,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  borderRadius: "12px",
                  padding: "11px 14px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                })}
              >
                Ver Clasificación
              </button>
              <button
                onClick={triggerResetPlayerPos}
                css={css({
                  flex: 1,
                  background: "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "11px 18px",
                  fontSize: "13px",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 8px 20px rgba(2, 132, 199, 0.4)",
                })}
              >
                <RotateCcw size={15} /> Jugar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        initialTab={leaderboardTab}
      />

      {/* Preload Poster & Intro Video Modal at Start (Covers everything from millisecond 0, zero loading screens) */}
      <PreloadAndIntroModal
        onOpenLeaderboard={() => {
          setLeaderboardTab("school");
          setShowLeaderboardModal(true);
        }}
      />
    </div>
  );
}

const kbdStyle = css({
  background: "rgba(255, 255, 255, 0.12)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "4px",
  padding: "2px 6px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "#38bdf8",
  boxShadow: "0 2px 0 rgba(0, 0, 0, 0.3)",
});
