import React, { useState, useRef } from "react";
import { css } from "@emotion/react";
import { Play, SkipForward, Trophy, User, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useGameStore } from "@/state/gameStore";

interface Props {
  onOpenLeaderboard: () => void;
}

export function PreloadAndIntroModal({ onOpenLeaderboard }: Props) {
  const gameStarted = useGameStore((s) => s.gameStarted);
  const setGameStarted = useGameStore((s) => s.setGameStarted);
  const isPlayingIntro = useGameStore((s) => s.isPlayingIntro);
  const setIsPlayingIntro = useGameStore((s) => s.setIsPlayingIntro);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setStartTime = useGameStore((s) => s.setStartTime);

  const [inputName, setInputName] = useState(playerName || "");
  const [nameError, setNameError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const precargaImgUrl = `${import.meta.env.BASE_URL}images/precarga.jpg`;
  const introVideoUrl = `${import.meta.env.BASE_URL}video/intro.mp4`;

  // Start with Intro Video
  const handleStartWithIntro = () => {
    const finalName = inputName.trim() || "Aventurero";
    setPlayerName(finalName);
    setIsPlayingIntro(true);
  };

  // Jump straight to gameplay
  const handleStartDirectly = () => {
    const finalName = inputName.trim() || "Aventurero";
    setPlayerName(finalName);
    setIsPlayingIntro(false);
    setGameStarted(true);
    setStartTime(Date.now());
  };

  // Video finished or skipped
  const handleFinishVideo = () => {
    setIsPlayingIntro(false);
    setGameStarted(true);
    setStartTime(Date.now());
  };

  if (gameStarted) return null;

  // 1. INTRO VIDEO SCREEN
  if (isPlayingIntro) {
    return (
      <div
        css={css({
          position: "fixed",
          inset: 0,
          zIndex: 15000,
          backgroundColor: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <video
          ref={videoRef}
          src={introVideoUrl}
          autoPlay
          playsInline
          muted={isMuted}
          onEnded={handleFinishVideo}
          css={css({
            width: "100%",
            height: "100%",
            objectFit: "contain",
          })}
        />

        {/* Skip Intro & Sound Control Buttons */}
        <div
          css={css({
            position: "absolute",
            top: "1.5rem",
            right: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 16000,
          })}
        >
          <button
            onClick={() => setIsMuted(!isMuted)}
            css={css({
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "white",
              padding: "10px",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": { background: "rgba(15, 23, 42, 0.95)" },
            })}
            title={isMuted ? "Activar audio" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <button
            onClick={handleFinishVideo}
            css={css({
              background: "linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)",
              border: "none",
              color: "white",
              padding: "10px 20px",
              borderRadius: "24px",
              fontWeight: 800,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 8px 24px rgba(234, 88, 12, 0.5)",
              transition: "transform 0.15s ease",
              "&:hover": { transform: "scale(1.04)" },
            })}
          >
            <span>Saltar Intro</span>
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    );
  }

  // 2. PRELOAD / WELCOME POSTER SCREEN
  return (
    <div
      css={css({
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#0d1117",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        overflowY: "auto",
        fontFamily: "system-ui, -apple-system, sans-serif",
      })}
    >
      {/* Background Poster Image with Blur and Gradient */}
      <div
        css={css({
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${precargaImgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.4) blur(4px)",
          transform: "scale(1.05)",
        })}
      />
      <div
        css={css({
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at center, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
        })}
      />

      {/* Main Card */}
      <div
        css={css({
          position: "relative",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(20px)",
          border: "2px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "28px",
          width: "100%",
          maxWidth: "460px",
          padding: "26px 24px",
          boxShadow: "0 30px 70px rgba(0, 0, 0, 0.8), 0 0 50px rgba(56, 189, 248, 0.2)",
          color: "white",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          animation: "scaleUp 0.3s ease",
          "@keyframes scaleUp": {
            from: { opacity: 0, transform: "scale(0.95)" },
            to: { opacity: 1, transform: "scale(1)" },
          },
        })}
      >
        {/* Poster Thumbnail */}
        <div
          css={css({
            width: "100%",
            height: "170px",
            borderRadius: "18px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.2)",
          })}
        >
          <img
            src={precargaImgUrl}
            alt="Anserma 3D Poster"
            css={css({
              width: "100%",
              height: "100%",
              objectFit: "cover",
            })}
          />
          <div
            css={css({
              position: "absolute",
              bottom: "8px",
              left: "10px",
              background: "rgba(15, 23, 42, 0.85)",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#38bdf8",
              border: "1px solid rgba(56, 189, 248, 0.4)",
            })}
          >
            🇨🇴 Anserma, Caldas
          </div>
        </div>

        {/* Title */}
        <div>
          <h1
            css={css({
              fontSize: "26px",
              fontWeight: 900,
              margin: 0,
              background: "linear-gradient(90deg, #38bdf8 0%, #facc15 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.5px",
            })}
          >
            ANSERMA 3D
          </h1>
          <p
            css={css({
              fontSize: "12.5px",
              color: "#cbd5e1",
              margin: "6px 0 0 0",
              lineHeight: 1.4,
            })}
          >
            Compite por el <strong>Top 3</strong>: Llega al <strong>Colegio</strong> más rápido y encuentra el mono oculto (<strong>Zusana</strong>).
          </p>
        </div>

        {/* Name Input */}
        <div css={css({ textAlign: "left", display: "flex", flexDirection: "column", gap: "6px" })}>
          <label
            css={css({
              fontSize: "12px",
              fontWeight: 700,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            })}
          >
            <User size={14} color="#38bdf8" />
            Ingresa tu Nombre de Participante:
          </label>
          <input
            type="text"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value);
              if (nameError) setNameError(false);
            }}
            placeholder="Ej: Juan_Anserma"
            maxLength={20}
            css={css({
              background: "rgba(255, 255, 255, 0.08)",
              border: nameError ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "14px",
              padding: "12px 16px",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              outline: "none",
              transition: "border 0.2s ease",
              "&:focus": {
                border: "2px solid #38bdf8",
                background: "rgba(255, 255, 255, 0.12)",
              },
            })}
          />
        </div>

        {/* Action Buttons */}
        <div css={css({ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" })}>
          <button
            onClick={handleStartWithIntro}
            css={css({
              background: "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
              color: "white",
              border: "none",
              borderRadius: "14px",
              padding: "13px 20px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              boxShadow: "0 10px 25px rgba(2, 132, 199, 0.5)",
              transition: "all 0.15s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 14px 30px rgba(2, 132, 199, 0.7)",
              },
            })}
          >
            <Play size={18} fill="currentColor" />
            <span>Comenzar</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            css={css({
              width: "100%",
              background: "rgba(250, 204, 21, 0.12)",
              border: "1px solid rgba(250, 204, 21, 0.3)",
              color: "#facc15",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "12.5px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              "&:hover": { background: "rgba(250, 204, 21, 0.22)" },
            })}
          >
            <Trophy size={14} />
            <span>Ver Top 3</span>
          </button>
        </div>
      </div>
    </div>
  );
}
