import React, { Suspense, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Sky, Environment, Html } from "@react-three/drei";
import { css } from "@emotion/react";
import { Map } from "./Map";
import { Player } from "./Player";
import { TouchControls } from "./TouchControls";
import { useGameStore } from "@/state/gameStore";
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
} from "lucide-react";

function Loader() {
  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          background: "rgba(15, 23, 42, 0.92)",
          color: "white",
          padding: "18px 28px",
          borderRadius: "16px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "280px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(255,255,255,0.2)",
            borderTopColor: "#38bdf8",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "0.5px" }}>
          Cargando Calles de Anserma y Personaje...
        </span>
      </div>
    </Html>
  );
}

export function GameView() {
  const currentAnimation = useGameStore((s) => s.currentAnimation);
  const speed = useGameStore((s) => s.speed);
  const triggerResetPlayerPos = useGameStore((s) => s.triggerResetPlayerPos);
  const gameWon = useGameStore((s) => s.gameWon);
  const distanceToGoal = useGameStore((s) => s.distanceToGoal);
  const progressPercent = useGameStore((s) => s.progressPercent);

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
          inclination={0.45}
          azimuth={0.25}
        />
        <Environment preset="city" environmentIntensity={0.65} />

        <Suspense fallback={<Loader />}>
          <Map />
          <Player />
        </Suspense>
      </Canvas>

      {/* Virtual On-Screen Joystick & Action Buttons for Mobile */}
      <TouchControls />

      {/* Top Center Mission & Progress HUD */}
      <div
        css={css({
          position: "absolute",
          top: isMobile ? "3.6rem" : "4.0rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          padding: isMobile ? "8px 16px" : "10px 24px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 14px 34px rgba(0, 0, 0, 0.4)",
          width: isMobile ? "90%" : "auto",
          maxWidth: "440px",
          zIndex: 120,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        })}
      >
        <div
          css={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: isMobile ? "11px" : "12px",
            fontWeight: 600,
          })}
        >
          <div css={css({ display: "flex", alignItems: "center", gap: "6px" })}>
            <Navigation size={13} color="#38bdf8" />
            <span css={css({ color: "#e2e8f0" })}>
              Objetivo: <strong>Colegio de Occidente</strong>
            </span>
          </div>
          <span css={css({ color: "#facc15", fontWeight: 700 })}>
            {distanceToGoal} m restantes
          </span>
        </div>

        {/* Progress Bar */}
        <div
          css={css({
            width: "100%",
            height: "7px",
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

        <div
          css={css({
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9px",
            color: "#94a3b8",
          })}
        >
          <span>🌳 Parque Principal</span>
          <span>🏫 Colegio (Meta)</span>
        </div>
      </div>

      {/* Floating HUD Controls (Top Left, collapsible on mobile) */}
      <div
        css={css({
          position: "absolute",
          top: isMobile ? "7.8rem" : "4.0rem",
          left: isMobile ? "1rem" : "1.5rem",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "14px",
          padding: showControlsHelp ? "12px 16px" : "8px 12px",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxShadow: "0 16px 36px rgba(0, 0, 0, 0.35)",
          maxWidth: isMobile ? "240px" : "300px",
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
            <RotateCcw size={11} />
            Spawn
          </button>
        </div>

        {/* Collapsible Controls cheatsheet */}
        {showControlsHelp && (
          <div
            css={css({
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "11px",
            })}
          >
            <div
              css={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span css={css({ color: "#94a3b8" })}>Moverse:</span>
              <span css={css({ fontWeight: 600, color: "#f1f5f9" })}>
                {isMobile ? (
                  "Joystick virtual"
                ) : (
                  <>
                    <kbd css={kbdStyle}>W</kbd> <kbd css={kbdStyle}>A</kbd>{" "}
                    <kbd css={kbdStyle}>S</kbd> <kbd css={kbdStyle}>D</kbd>
                  </>
                )}
              </span>
            </div>

            <div
              css={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span
                css={css({
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <Flame size={12} color="#f97316" /> Correr:
              </span>
              <span css={css({ fontWeight: 600, color: "#f1f5f9" })}>
                {isMobile ? "Botón 🏃" : <kbd css={kbdStyle}>Shift</kbd>}
              </span>
            </div>

            <div
              css={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span
                css={css({
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <Sparkles size={12} color="#eab308" /> Celebrar:
              </span>
              <span css={css({ fontWeight: 600, color: "#f1f5f9" })}>
                {isMobile ? "Botón ✨" : <kbd css={kbdStyle}>G</kbd>}
              </span>
            </div>

            <div
              css={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span
                css={css({
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <Skull size={12} color="#ef4444" /> Caer:
              </span>
              <span css={css({ fontWeight: 600, color: "#f1f5f9" })}>
                {isMobile ? "Botón 💀" : <kbd css={kbdStyle}>M</kbd>}
              </span>
            </div>

            <div
              css={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <span
                css={css({
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                })}
              >
                <Compass size={12} color="#38bdf8" /> Cámara:
              </span>
              <span css={css({ color: "#cbd5e1" })}>
                {isMobile ? "Deslizar pantalla" : "Arrastrar Mouse"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Status & Speed Pill (bottom-center) */}
      <div
        css={css({
          position: "absolute",
          bottom: isMobile ? "0.8rem" : "1.75rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: "9999px",
          padding: isMobile ? "6px 14px" : "8px 22px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "10px" : "16px",
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          zIndex: 120,
        })}
      >
        <div css={css({ display: "flex", alignItems: "center", gap: "6px" })}>
          <span css={css({ fontSize: isMobile ? "15px" : "18px" })}>
            {status.icon}
          </span>
          <span
            css={css({
              fontWeight: 700,
              fontSize: isMobile ? "11px" : "13px",
              color: status.color,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            })}
          >
            {status.label}
          </span>
        </div>

        <div
          css={css({
            width: "1px",
            height: "16px",
            background: "rgba(255,255,255,0.18)",
          })}
        />

        <div css={css({ display: "flex", alignItems: "baseline", gap: "4px" })}>
          <span css={css({ fontSize: "10px", color: "#94a3b8" })}>Velocidad:</span>
          <span
            css={css({
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: 700,
              color: "#38bdf8",
            })}
          >
            {(speed * 3.6).toFixed(1)}
          </span>
          <span css={css({ fontSize: "9px", color: "#64748b" })}>km/h</span>
        </div>
      </div>

      {/* Victory Celebration Modal when reaching the School */}
      {gameWon && (
        <div
          css={css({
            position: "absolute",
            inset: 0,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            animation: "fadeIn 0.5s ease",
            padding: "1rem",
            "@keyframes fadeIn": {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          })}
        >
          <div
            css={css({
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "2px solid #facc15",
              borderRadius: "24px",
              padding: isMobile ? "24px 20px" : "36px 44px",
              textAlign: "center",
              boxShadow:
                "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(250, 204, 21, 0.3)",
              maxWidth: "440px",
              width: "100%",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            })}
          >
            <div
              css={css({
                width: isMobile ? "60px" : "72px",
                height: isMobile ? "60px" : "72px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 25px rgba(250, 204, 21, 0.6)",
              })}
            >
              <Award size={isMobile ? 32 : 40} color="#0f172a" />
            </div>

            <div css={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
              <h2
                css={css({
                  fontSize: isMobile ? "22px" : "26px",
                  fontWeight: 900,
                  color: "#facc15",
                  margin: 0,
                  letterSpacing: "0.5px",
                })}
              >
                ¡LLEGASTE AL COLEGIO!
              </h2>
              <p
                css={css({
                  color: "#cbd5e1",
                  fontSize: isMobile ? "12px" : "14px",
                  margin: 0,
                  lineHeight: 1.4,
                })}
              >
                ¡Felicidades! Has completado el recorrido por Anserma desde el{" "}
                <strong>Parque Principal</strong> hasta el{" "}
                <strong>Colegio de Occidente</strong>.
              </p>
            </div>

            <div
              css={css({
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: "12px",
                padding: "8px 16px",
                fontSize: "12px",
                color: "#94a3b8",
              })}
            >
              🎉 El personaje está bailando y celebrando tu victoria.
            </div>

            <button
              onClick={triggerResetPlayerPos}
              css={css({
                background: "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                padding: isMobile ? "10px 24px" : "12px 28px",
                fontSize: isMobile ? "14px" : "15px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 10px 20px rgba(2, 132, 199, 0.4)",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 14px 28px rgba(2, 132, 199, 0.6)",
                },
              })}
            >
              <RotateCcw size={16} /> Jugar de nuevo
            </button>
          </div>
        </div>
      )}
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
