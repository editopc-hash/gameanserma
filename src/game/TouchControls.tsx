import React, { useRef, useState, useEffect, useCallback } from "react";
import { css } from "@emotion/react";
import { useGameStore } from "@/state/gameStore";
import { Flame, Sparkles, Skull } from "lucide-react";

export function TouchControls() {
  const setTouchMove = useGameStore((s) => s.setTouchMove);
  const touchRunning = useGameStore((s) => s.touchRunning);
  const setTouchRunning = useGameStore((s) => s.setTouchRunning);
  const setTriggerAction = useGameStore((s) => s.setTriggerAction);

  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activeTouchId = useRef<number | null>(null);

  const maxRadius = 42;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const resetJoystick = useCallback(() => {
    activeTouchId.current = null;
    setKnobPos({ x: 0, y: 0 });
    setTouchMove({ x: 0, y: 0 });
  }, [setTouchMove]);

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        resetJoystick();
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(distance, maxRadius);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });

    // Normalized move vector (-1 to 1)
    // Note: dy is positive downward on screen, so invert Y for forward movement
    const normX = knobX / maxRadius;
    const normY = -(knobY / maxRadius);
    setTouchMove({ x: normX, y: normY });
  };

  return (
    <div
      css={css({
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 150,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
      })}
    >
      {/* Virtual Joystick (Bottom Left) */}
      <div
        ref={joystickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={resetJoystick}
        css={css({
          position: "absolute",
          bottom: "2.5rem",
          left: "2rem",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,23,42,0.65) 0%, rgba(30,41,59,0.75) 100%)",
          backdropFilter: "blur(8px)",
          border: "2px solid rgba(56, 189, 248, 0.4)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 0 15px rgba(56,189,248,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          touchAction: "none",
        })}
      >
        {/* Joystick Center Knob */}
        <div
          css={css({
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
            boxShadow: "0 4px 15px rgba(56, 189, 248, 0.6)",
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: activeTouchId.current === null ? "transform 0.15s ease-out" : "none",
            border: "2px solid #ffffff",
          })}
        />
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div
        css={css({
          position: "absolute",
          bottom: "2.2rem",
          right: "1.8rem",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "flex-end",
          pointerEvents: "auto",
        })}
      >
        <div css={css({ display: "flex", gap: "10px", alignItems: "center" })}>
          {/* Fall / KO Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              setTriggerAction("dead");
            }}
            onClick={() => setTriggerAction("dead")}
            title="Caer / K.O."
            css={css({
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.8)",
              backdropFilter: "blur(8px)",
              border: "2px solid rgba(255, 255, 255, 0.4)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(239, 68, 68, 0.4)",
              cursor: "pointer",
              touchAction: "none",
              "&:active": {
                transform: "scale(0.92)",
              },
            })}
          >
            <Skull size={22} />
          </button>

          {/* Dance / Celebrate Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              setTriggerAction("win");
            }}
            onClick={() => setTriggerAction("win")}
            title="Celebrar / Bailar"
            css={css({
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
              backdropFilter: "blur(8px)",
              border: "2px solid rgba(255, 255, 255, 0.5)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(234, 179, 8, 0.5)",
              cursor: "pointer",
              touchAction: "none",
              "&:active": {
                transform: "scale(0.92)",
              },
            })}
          >
            <Sparkles size={24} />
          </button>
        </div>

        {/* Sprint / Run Button (large) */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            setTouchRunning(!touchRunning);
          }}
          onClick={() => setTouchRunning(!touchRunning)}
          title="Alternar Correr"
          css={css({
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            background: touchRunning
              ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
              : "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(10px)",
            border: touchRunning
              ? "3px solid #ffedd5"
              : "2px solid rgba(249, 115, 22, 0.5)",
            color: touchRunning ? "white" : "#fdba74",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: touchRunning
              ? "0 0 25px rgba(249, 115, 22, 0.7), inset 0 0 15px rgba(255,255,255,0.4)"
              : "0 6px 18px rgba(0, 0, 0, 0.4)",
            cursor: "pointer",
            touchAction: "none",
            transition: "all 0.15s ease",
            "&:active": {
              transform: "scale(0.94)",
            },
          })}
        >
          <Flame size={26} />
          <span css={css({ fontSize: "9px", fontWeight: 800, marginTop: "2px", letterSpacing: "0.5px" })}>
            {touchRunning ? "CORRIENDO" : "CORRER"}
          </span>
        </button>
      </div>
    </div>
  );
}
