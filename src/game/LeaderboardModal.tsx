import React, { useState } from "react";
import { css } from "@emotion/react";
import { Trophy, Award, Medal, X, Clock, Flame, Smile } from "lucide-react";
import {
  getLeaderboard,
  DEFAULT_SCHOOL_RECORDS,
  DEFAULT_SUSANA_RECORDS,
  LeaderboardEntry,
} from "@/state/gameStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "school" | "susana";
}

function formatTime(sec: number): string {
  if (sec < 60) {
    return `${sec.toFixed(1)}s`;
  }
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}m ${s}s`;
}

export function LeaderboardModal({ isOpen, onClose, initialTab = "school" }: Props) {
  const [tab, setTab] = useState<"school" | "susana">(initialTab);

  if (!isOpen) return null;

  const schoolRecords = getLeaderboard("anserma_school_leaderboard", DEFAULT_SCHOOL_RECORDS).slice(0, 5);
  const susanaRecords = getLeaderboard("anserma_susana_leaderboard", DEFAULT_SUSANA_RECORDS).slice(0, 5);

  const activeRecords = tab === "school" ? schoolRecords : susanaRecords;

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return { label: "1º", icon: "🥇", color: "#facc15", bg: "rgba(250, 204, 21, 0.15)" };
      case 1:
        return { label: "2º", icon: "🥈", color: "#e2e8f0", bg: "rgba(226, 232, 240, 0.15)" };
      case 2:
        return { label: "3º", icon: "🥉", color: "#fb923c", bg: "rgba(251, 146, 60, 0.15)" };
      default:
        return { label: `${index + 1}º`, icon: "⭐", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.1)" };
    }
  };

  return (
    <div
      css={css({
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(10, 15, 29, 0.88)",
        backdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.25s ease",
        fontFamily: "system-ui, -apple-system, sans-serif",
      })}
    >
      <div
        css={css({
          background: "linear-gradient(155deg, #1e293b 0%, #0f172a 100%)",
          border: "2px solid rgba(250, 204, 21, 0.4)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "480px",
          color: "white",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(250, 204, 21, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        })}
      >
        {/* Header */}
        <div
          css={css({
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          })}
        >
          <div css={css({ display: "flex", alignItems: "center", gap: "10px" })}>
            <div
              css={css({
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(234, 179, 8, 0.4)",
              })}
            >
              <Trophy size={22} color="#0f172a" />
            </div>
            <div>
              <h2 css={css({ fontSize: "18px", fontWeight: 800, margin: 0, color: "#facc15" })}>
                Tabla de Clasificación
              </h2>
              <span css={css({ fontSize: "11px", color: "#94a3b8" })}>
                Los más rápidos de Anserma 🇨🇴
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            css={css({
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#cbd5e1",
              "&:hover": { background: "rgba(255,255,255,0.18)", color: "white" },
            })}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          css={css({
            display: "flex",
            gap: "8px",
            padding: "12px 16px 6px",
            background: "rgba(0,0,0,0.2)",
          })}
        >
          <button
            onClick={() => setTab("school")}
            css={css({
              flex: 1,
              padding: "10px 12px",
              borderRadius: "12px",
              border: tab === "school" ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
              background: tab === "school" ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.04)",
              color: tab === "school" ? "#38bdf8" : "#94a3b8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            })}
          >
            🏫 Llegada al Colegio
          </button>
          <button
            onClick={() => setTab("susana")}
            css={css({
              flex: 1,
              padding: "10px 12px",
              borderRadius: "12px",
              border: tab === "susana" ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.1)",
              background: tab === "susana" ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.04)",
              color: tab === "susana" ? "#fbbf24" : "#94a3b8",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            })}
          >
            🐒 Hallazgo de Zusana
          </button>
        </div>

        {/* List of records */}
        <div css={css({ padding: "14px 16px 20px", display: "flex", flexDirection: "column", gap: "8px" })}>
          <div
            css={css({
              fontSize: "12px",
              color: "#94a3b8",
              marginBottom: "4px",
              display: "flex",
              justifyContent: "space-between",
              padding: "0 8px",
            })}
          >
            <span>POSICIÓN Y PARTICIPANTE</span>
            <span>TIEMPO RÉCORD</span>
          </div>

          {activeRecords.map((item, idx) => {
            const badge = getRankBadge(idx);
            return (
              <div
                key={`${item.name}-${idx}`}
                css={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "14px",
                  background: badge.bg,
                  border: `1px solid ${badge.color}33`,
                  transition: "all 0.15s ease",
                })}
              >
                <div css={css({ display: "flex", alignItems: "center", gap: "10px" })}>
                  <span css={css({ fontSize: "20px" })}>{badge.icon}</span>
                  <div>
                    <div css={css({ fontWeight: 800, fontSize: "14px", color: badge.color })}>
                      {item.name}
                    </div>
                    <span css={css({ fontSize: "10px", color: "#64748b" })}>{item.date}</span>
                  </div>
                </div>

                <div
                  css={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(0,0,0,0.3)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontWeight: 800,
                    fontSize: "14px",
                    color: "#f8fafc",
                  })}
                >
                  <Clock size={14} color="#38bdf8" />
                  {formatTime(item.time)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          css={css({
            padding: "12px 16px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "center",
          })}
        >
          <button
            onClick={onClose}
            css={css({
              background: "linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "10px 28px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 6px 16px rgba(2, 132, 199, 0.35)",
            })}
          >
            Cerrar Clasificación
          </button>
        </div>
      </div>
    </div>
  );
}
