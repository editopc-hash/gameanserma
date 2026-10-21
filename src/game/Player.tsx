import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { AnimationState, useGameStore, START_POS, GOAL_POS } from "@/state/gameStore";

export function Player() {
  const group = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();

  // Load GLTF files
  const walkGltf = useGLTF("/models/caminar.glb");
  const runGltf = useGLTF("/models/correr.glb");
  const winGltf = useGLTF("/models/ganar.glb");
  const deadGltf = useGLTF("/models/muerto.glb");

  // Merge and rename animation clips
  const clips = useMemo(() => {
    const list: THREE.AnimationClip[] = [];

    // 1. Idle (use Casual_Walk)
    const idleClip =
      walkGltf.animations.find((a) => a.name === "Casual_Walk") ||
      walkGltf.animations[0];
    if (idleClip) {
      const c = idleClip.clone();
      c.name = "idle";
      list.push(c);
    }

    // 2. Walk (Walking)
    const walkClip =
      walkGltf.animations.find((a) => a.name === "Walking") ||
      walkGltf.animations.find((a) => a.name !== "Casual_Walk") ||
      walkGltf.animations[0];
    if (walkClip) {
      const c = walkClip.clone();
      c.name = "walk";
      list.push(c);
    }

    // 3. Run (Running)
    const runClip =
      runGltf.animations.find((a) => a.name === "Running") ||
      runGltf.animations[0];
    if (runClip) {
      const c = runClip.clone();
      c.name = "run";
      list.push(c);
    }

    // 4. Win / Celebrate (All_Night_Dance)
    const winClip =
      winGltf.animations.find((a) => a.name === "All_Night_Dance") ||
      winGltf.animations.find((a) => a.name.toLowerCase().includes("dance")) ||
      winGltf.animations[2];
    if (winClip) {
      const c = winClip.clone();
      c.name = "win";
      list.push(c);
    }

    // 5. Dead / Fall (Dead)
    const deadClip =
      deadGltf.animations.find((a) => a.name === "Dead") ||
      deadGltf.animations.find((a) => a.name.toLowerCase().includes("dead")) ||
      deadGltf.animations[3];
    if (deadClip) {
      const c = deadClip.clone();
      c.name = "dead";
      list.push(c);
    }

    return list;
  }, [walkGltf, runGltf, winGltf, deadGltf]);

  const { actions } = useAnimations(clips, group);

  // Enable shadows on the player model
  useEffect(() => {
    walkGltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [walkGltf]);

  // Game store
  const setCurrentAnimation = useGameStore((s) => s.setCurrentAnimation);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const resetPlayerPos = useGameStore((s) => s.resetPlayerPos);
  const gameWon = useGameStore((s) => s.gameWon);
  const setGameWon = useGameStore((s) => s.setGameWon);
  const setDistanceToGoal = useGameStore((s) => s.setDistanceToGoal);
  const setProgressPercent = useGameStore((s) => s.setProgressPercent);

  // Mobile Touch Controls from store
  const touchMove = useGameStore((s) => s.touchMove);
  const touchRunning = useGameStore((s) => s.touchRunning);
  const triggerAction = useGameStore((s) => s.triggerAction);
  const setTriggerAction = useGameStore((s) => s.setTriggerAction);

  // States
  const [animState, setAnimState] = useState<AnimationState>("idle");
  const currentActionName = useRef<string>("idle");

  // Key tracking
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false,
    g: false,
    m: false,
  });

  const specialState = useRef<"win" | "dead" | null>(null);

  // Handle triggered touch actions (dance / ko)
  useEffect(() => {
    if (triggerAction) {
      if (triggerAction === specialState.current) {
        specialState.current = null;
      } else {
        specialState.current = triggerAction;
      }
      setTriggerAction(null);
    }
  }, [triggerAction, setTriggerAction]);

  // Camera angles: default yaw = Math.PI to look North towards Colegio
  const cameraAngle = useRef({ yaw: Math.PI, pitch: 0.28 });
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Camera touch swipe tracking
  const touchCamId = useRef<number | null>(null);
  const lastTouchCamPos = useRef({ x: 0, y: 0 });

  // Raycasters for collision & ground height
  const downRaycaster = useMemo(
    () => new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 15),
    []
  );
  const obstacleRaycaster = useMemo(
    () => new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0, 1.0),
    []
  );

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") keys.current.forward = true;
      if (key === "s" || key === "arrowdown") keys.current.backward = true;
      if (key === "a" || key === "arrowleft") keys.current.left = true;
      if (key === "d" || key === "arrowright") keys.current.right = true;
      if (e.key === "Shift") keys.current.shift = true;

      // Celebrate toggle
      if (key === "g") {
        if (specialState.current === "win") {
          specialState.current = null;
        } else {
          specialState.current = "win";
        }
      }

      // Dead toggle
      if (key === "m") {
        if (specialState.current === "dead") {
          specialState.current = null;
        } else {
          specialState.current = "dead";
        }
      }

      // If moving, clear win or dead state
      if (
        (keys.current.forward ||
          keys.current.backward ||
          keys.current.left ||
          keys.current.right) &&
        specialState.current !== null &&
        !gameWon
      ) {
        specialState.current = null;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") keys.current.forward = false;
      if (key === "s" || key === "arrowdown") keys.current.backward = false;
      if (key === "a" || key === "arrowleft") keys.current.left = false;
      if (key === "d" || key === "arrowright") keys.current.right = false;
      if (e.key === "Shift") keys.current.shift = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [gameWon]);

  // Mouse & Touch camera orbit controls
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isMouseDown.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      cameraAngle.current.yaw -= dx * 0.005;
      cameraAngle.current.pitch = Math.max(
        0.05,
        Math.min(Math.PI / 2.5, cameraAngle.current.pitch + dy * 0.005)
      );
    };

    // Touch swipe camera rotation for mobile
    const onTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        // Only accept touch if on the upper half or right-upper quadrant (away from virtual joystick)
        const isNearJoystick = touch.clientX < 150 && touch.clientY > window.innerHeight - 170;
        const isNearButtons = touch.clientX > window.innerWidth - 150 && touch.clientY > window.innerHeight - 170;

        if (!isNearJoystick && !isNearButtons && touchCamId.current === null) {
          touchCamId.current = touch.identifier;
          lastTouchCamPos.current = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchCamId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchCamId.current) {
          const dx = touch.clientX - lastTouchCamPos.current.x;
          const dy = touch.clientY - lastTouchCamPos.current.y;
          lastTouchCamPos.current = { x: touch.clientX, y: touch.clientY };

          cameraAngle.current.yaw -= dx * 0.006;
          cameraAngle.current.pitch = Math.max(
            0.05,
            Math.min(Math.PI / 2.5, cameraAngle.current.pitch + dy * 0.006)
          );
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchCamId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchCamId.current) {
          touchCamId.current = null;
          break;
        }
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);

      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Spawn player at Parque Principal (Inicio)
  const spawnPlayer = () => {
    if (group.current) {
      group.current.position.set(START_POS[0], START_POS[1], START_POS[2]);
      group.current.rotation.set(0, 0, 0); // Face North toward Colegio
      cameraAngle.current = { yaw: Math.PI, pitch: 0.28 };
      specialState.current = null;
    }
  };

  useEffect(() => {
    spawnPlayer();
  }, [resetPlayerPos]);

  // When game is won, trigger celebration dance
  useEffect(() => {
    if (gameWon) {
      specialState.current = "win";
    }
  }, [gameWon]);

  // Handle animation switching with crossfade
  useEffect(() => {
    if (!actions) return;

    const prevAction = actions[currentActionName.current];
    const nextAction = actions[animState];

    if (nextAction && nextAction !== prevAction) {
      nextAction.reset();

      if (animState === "dead") {
        nextAction.setLoop(THREE.LoopOnce, 1);
        nextAction.clampWhenFinished = true;
      } else {
        nextAction.setLoop(THREE.LoopRepeat, Infinity);
      }

      nextAction.fadeIn(0.2).play();

      if (prevAction) {
        prevAction.fadeOut(0.2);
      }

      currentActionName.current = animState;
    } else if (nextAction && !nextAction.isRunning()) {
      nextAction.play();
    }

    setCurrentAnimation(animState);
  }, [animState, actions, setCurrentAnimation]);

  // Frame update
  useFrame((_, delta) => {
    if (!group.current) return;

    const player = group.current;

    // Movement from keyboard OR touch joystick
    const hasKeyboardMove =
      keys.current.forward ||
      keys.current.backward ||
      keys.current.left ||
      keys.current.right;

    const hasTouchMove =
      Math.abs(touchMove.x) > 0.08 || Math.abs(touchMove.y) > 0.08;

    const isMoving = hasKeyboardMove || hasTouchMove;

    // Clear win or dead state if player starts moving
    if (isMoving && specialState.current !== null && !gameWon) {
      specialState.current = null;
    }

    const isRunning = keys.current.shift || touchRunning;

    let targetAnim: AnimationState = "idle";

    if (specialState.current === "dead") {
      targetAnim = "dead";
    } else if (specialState.current === "win" || gameWon) {
      targetAnim = "win";
    } else if (isMoving) {
      targetAnim = isRunning ? "run" : "walk";
    } else {
      targetAnim = "idle";
    }

    if (targetAnim !== animState) {
      setAnimState(targetAnim);
    }

    // Velocity & movement
    let moveSpeed = 0;
    if (isMoving && specialState.current === null && !gameWon) {
      moveSpeed = isRunning ? 9.5 : 4.2;
    }
    setSpeed(moveSpeed);

    if (moveSpeed > 0) {
      let moveZ = 0;
      let moveX = 0;

      if (keys.current.forward) moveZ -= 1;
      if (keys.current.backward) moveZ += 1;
      if (keys.current.left) moveX -= 1;
      if (keys.current.right) moveX += 1;

      // Add touch joystick input
      if (hasTouchMove) {
        moveX += touchMove.x;
        moveZ -= touchMove.y; // touchMove.y is positive forward
      }

      const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();

      // Rotate input direction by camera yaw
      inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle.current.yaw);

      // Smoothly rotate player toward movement direction
      const targetRotationY = Math.atan2(inputDir.x, inputDir.z);
      const diff = THREE.MathUtils.euclideanModulo(
        targetRotationY - player.rotation.y + Math.PI,
        Math.PI * 2
      ) - Math.PI;
      player.rotation.y += diff * Math.min(1, delta * 14);

      // Obstacle collision check using Raycaster
      const moveDistance = moveSpeed * delta;
      const rayOrigin = player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      obstacleRaycaster.set(rayOrigin, inputDir);

      const intersects = obstacleRaycaster.intersectObjects(scene.children, true);
      const obstacleHit = intersects.find(
        (hit) => hit.object.userData?.isObstacle && hit.distance < 0.65
      );

      if (!obstacleHit) {
        player.position.addScaledVector(inputDir, moveDistance);
      }
    }

    // Ground raycasting: ONLY streets and ground plane, NEVER buildings
    const downOrigin = player.position.clone().add(new THREE.Vector3(0, 3, 0));
    downRaycaster.set(downOrigin, new THREE.Vector3(0, -1, 0));
    const groundHits = downRaycaster.intersectObjects(scene.children, true);
    const validGround = groundHits.find(
      (hit) =>
        (hit.object.userData?.isGround === true || hit.object.userData?.isRoad === true) &&
        !hit.object.userData?.isObstacle
    );

    // Stay at street level (y = 0)
    const targetY = validGround ? validGround.point.y : 0;
    player.position.y = THREE.MathUtils.lerp(player.position.y, Math.max(0, targetY), 0.3);

    // Goal and distance calculations
    const dist = Math.hypot(
      player.position.x - GOAL_POS[0],
      player.position.z - GOAL_POS[2]
    );
    setDistanceToGoal(Math.round(dist));

    const totalZ = GOAL_POS[2] - START_POS[2];
    const currentZ = player.position.z - START_POS[2];
    const pct = Math.min(100, Math.max(0, Math.round((currentZ / totalZ) * 100)));
    setProgressPercent(pct);

    // Reached the school!
    if (dist < 6.5 && !gameWon) {
      setGameWon(true);
    }

    // Smooth third person camera following behind player
    const cameraDist = 5.2;
    const camOffset = new THREE.Vector3(
      Math.sin(cameraAngle.current.yaw) *
        Math.cos(cameraAngle.current.pitch) *
        cameraDist,
      Math.sin(cameraAngle.current.pitch) * cameraDist + 1.2,
      Math.cos(cameraAngle.current.yaw) *
        Math.cos(cameraAngle.current.pitch) *
        cameraDist
    );

    const desiredCamPos = player.position.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, 0.1);

    const lookTarget = player.position
      .clone()
      .add(new THREE.Vector3(0, 1.4, 0));
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={START_POS} dispose={null}>
      <primitive object={walkGltf.scene} scale={1} />
    </group>
  );
}

useGLTF.preload("/models/caminar.glb");
useGLTF.preload("/models/correr.glb");
useGLTF.preload("/models/ganar.glb");
useGLTF.preload("/models/muerto.glb");
