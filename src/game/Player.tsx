import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { AnimationState, useGameStore, START_POS, GOAL_POS } from "@/state/gameStore";

export function Player() {
  const group = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();

  // Load GLTF files
  const walkGltf = useGLTF(`${import.meta.env.BASE_URL}models/caminar.glb`);
  const runGltf = useGLTF(`${import.meta.env.BASE_URL}models/correr.glb`);
  const winGltf = useGLTF(`${import.meta.env.BASE_URL}models/ganar.glb`);
  const deadGltf = useGLTF(`${import.meta.env.BASE_URL}models/muerto.glb`);

  // Merge and rename animation clips - exactly as in the original working version
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

  // Game store
  const performanceMode = useGameStore((s) => s.performanceMode);

  // Enable/disable shadows on the player model based on performanceMode
  useEffect(() => {
    walkGltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = !performanceMode;
        child.receiveShadow = !performanceMode;
      }
    });
  }, [walkGltf, performanceMode]);

  const setCurrentAnimation = useGameStore((s) => s.setCurrentAnimation);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const resetPlayerPos = useGameStore((s) => s.resetPlayerPos);
  const gameWon = useGameStore((s) => s.gameWon);
  const setGameWon = useGameStore((s) => s.setGameWon);
  const setDistanceToGoal = useGameStore((s) => s.setDistanceToGoal);
  const setProgressPercent = useGameStore((s) => s.setProgressPercent);

  // Timers
  const startTime = useGameStore((s) => s.startTime);
  const setTimeElapsed = useGameStore((s) => s.setTimeElapsed);

  // Zusana Easter Egg hooks
  const suzannePos = useGameStore((s) => s.suzannePos);
  const foundSuzanne = useGameStore((s) => s.foundSuzanne);
  const setFoundSuzanne = useGameStore((s) => s.setFoundSuzanne);
  const setShowSuzanneModal = useGameStore((s) => s.setShowSuzanneModal);

  // Mobile Touch Controls from store
  const touchMove = useGameStore((s) => s.touchMove);
  const touchRunning = useGameStore((s) => s.touchRunning);
  const triggerAction = useGameStore((s) => s.triggerAction);
  const setTriggerAction = useGameStore((s) => s.setTriggerAction);

  // Dynamic Camera Distance (Zoom)
  const cameraDistance = useGameStore((s) => s.cameraDistance);
  const setCameraDistance = useGameStore((s) => s.setCameraDistance);
  const camDistTarget = useRef(cameraDistance || 1.65);
  const touchPinchDist = useRef<number | null>(null);

  useEffect(() => {
    camDistTarget.current = cameraDistance;
  }, [cameraDistance]);

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

  // Celebration song audio (sonidos/01.mp3)
  const celebrateAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sonidos/01.mp3`);
    audio.loop = true;
    audio.volume = 0.85;
    celebrateAudioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const audio = celebrateAudioRef.current;
    if (!audio) return;
    if (animState === "win") {
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } else {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [animState]);

  // Handle triggered touch actions (dance / ko)
  useEffect(() => {
    if (triggerAction) {
      if (triggerAction === specialState.current) {
        specialState.current = null;
        if (celebrateAudioRef.current && !celebrateAudioRef.current.paused) {
          celebrateAudioRef.current.pause();
          celebrateAudioRef.current.currentTime = 0;
        }
      } else {
        specialState.current = triggerAction;
        if (triggerAction === "win" && celebrateAudioRef.current) {
          celebrateAudioRef.current.currentTime = 0;
          celebrateAudioRef.current.play().catch(() => {});
        }
      }
      setTriggerAction(null);
    }
  }, [triggerAction, setTriggerAction]);

  // Camera angles
  const cameraAngle = useRef({ yaw: Math.PI, pitch: 0.22 });
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const touchCamId = useRef<number | null>(null);
  const lastTouchCamPos = useRef({ x: 0, y: 0 });

  // Raycasters for ground and wall collision
  const downRaycaster = useMemo(
    () => new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 15),
    []
  );
  const obstacleRaycaster = useMemo(
    () => new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0, 8.0),
    []
  );

  // Cache building obstacle and ground meshes for ultra-fast, zero-lag raycasting
  const obstacleMeshesRef = useRef<THREE.Mesh[]>([]);
  const groundMeshesRef = useRef<THREE.Mesh[]>([]);
  const lastUiTimeRef = useRef<number>(-1);
  const lastSpeedRef = useRef<number>(-1);
  const lastDistRef = useRef<number>(-1);
  const lastPctRef = useRef<number>(-1);

  const radialDirs = useMemo(
    () => [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.707, 0, 0.707),
      new THREE.Vector3(-0.707, 0, 0.707),
      new THREE.Vector3(0.707, 0, -0.707),
      new THREE.Vector3(-0.707, 0, -0.707),
    ],
    []
  );
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const downDir = useMemo(() => new THREE.Vector3(0, -1, 0), []);

  useEffect(() => {
    const updateObstacles = () => {
      const obsList: THREE.Mesh[] = [];
      const gndList: THREE.Mesh[] = [];
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (child.userData?.isObstacle) {
            obsList.push(child as THREE.Mesh);
          } else if (child.userData?.isGround || child.userData?.isRoad) {
            gndList.push(child as THREE.Mesh);
          }
        }
      });
      if (obsList.length > 0) {
        obstacleMeshesRef.current = obsList;
      }
      if (gndList.length > 0) {
        groundMeshesRef.current = gndList;
      }
    };
    updateObstacles();
    const t1 = setTimeout(updateObstacles, 600);
    const t2 = setTimeout(updateObstacles, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [scene]);

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
          if (celebrateAudioRef.current && !celebrateAudioRef.current.paused) {
            celebrateAudioRef.current.pause();
            celebrateAudioRef.current.currentTime = 0;
          }
        } else {
          specialState.current = "win";
          if (celebrateAudioRef.current) {
            celebrateAudioRef.current.currentTime = 0;
            celebrateAudioRef.current.play().catch(() => {});
          }
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

  // Mouse & Touch camera orbit controls (allows looking up and down freely)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "BUTTON")) return;
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

      cameraAngle.current.yaw -= dx * 0.0065;
      // Pitch from -0.85 (looking high up at buildings/sky) to +1.35 (looking down from above)
      cameraAngle.current.pitch = Math.max(
        -0.85,
        Math.min(1.35, cameraAngle.current.pitch + dy * 0.0065)
      );
    };

    // Wheel zoom for PC (0.8m to 7.5m)
    const onWheel = (e: WheelEvent) => {
      const next = Math.max(0.8, Math.min(7.5, camDistTarget.current + e.deltaY * 0.003));
      camDistTarget.current = next;
      setCameraDistance(next);
    };

    // Touch swipe camera rotation and pinch zoom for mobile
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchPinchDist.current = Math.hypot(dx, dy);
        return;
      }
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const target = touch.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "BUTTON")) continue;

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
      if (e.touches.length >= 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (touchPinchDist.current !== null) {
          const diff = touchPinchDist.current - dist;
          const next = Math.max(0.8, Math.min(7.5, camDistTarget.current + diff * 0.008));
          camDistTarget.current = next;
          setCameraDistance(next);
        }
        touchPinchDist.current = dist;
        return;
      }
      touchPinchDist.current = null;

      if (touchCamId.current === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === touchCamId.current) {
          const dx = touch.clientX - lastTouchCamPos.current.x;
          const dy = touch.clientY - lastTouchCamPos.current.y;
          lastTouchCamPos.current = { x: touch.clientX, y: touch.clientY };

          cameraAngle.current.yaw -= dx * 0.008;
          // Pitch from -0.85 (looking high up) to +1.35 (looking down)
          cameraAngle.current.pitch = Math.max(
            -0.85,
            Math.min(1.35, cameraAngle.current.pitch + dy * 0.008)
          );
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchPinchDist.current = null;
      }
      if (touchCamId.current === null) return;
      let stillPresent = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchCamId.current) {
          stillPresent = true;
          break;
        }
      }
      if (!stillPresent) {
        touchCamId.current = null;
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("wheel", onWheel, { passive: true });

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);

      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [setCameraDistance]);

  // Spawn player at Parque Principal (Inicio)
  const spawnPlayer = () => {
    if (group.current) {
      group.current.position.set(START_POS[0], START_POS[1], START_POS[2]);
      group.current.rotation.set(0, 0, 0); // Face North toward Colegio
      cameraAngle.current = { yaw: Math.PI, pitch: 0.22 };
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

  // Handle animation switching with crossfade - exactly as in the original working version
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

  // Frame update (optimized for maximum FPS and zero unnecessary React re-renders)
  useFrame((_, delta) => {
    if (!group.current) return;

    const player = group.current;

    // Timer update (throttled to 10Hz so React UI doesn't re-render 60 times/sec)
    if (!gameWon && startTime) {
      const elapsed = (Date.now() - startTime) / 1000;
      const roundedTenths = Math.floor(elapsed * 10);
      if (roundedTenths !== lastUiTimeRef.current) {
        lastUiTimeRef.current = roundedTenths;
        setTimeElapsed(elapsed);
      }
    }

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
    if (moveSpeed !== lastSpeedRef.current) {
      lastSpeedRef.current = moveSpeed;
      setSpeed(moveSpeed);
    }

    const hasCachedObstacles = obstacleMeshesRef.current.length > 0;
    const obstacles = hasCachedObstacles ? obstacleMeshesRef.current : scene.children;
    const MIN_WALL_DIST = 1.15;

    if (moveSpeed > 0) {
      let moveZ = 0;
      let moveX = 0;

      if (keys.current.forward) moveZ -= 1;
      if (keys.current.backward) moveZ += 1;
      if (keys.current.left) moveX -= 1;
      if (keys.current.right) moveX += 1;

      if (hasTouchMove) {
        moveX += touchMove.x;
        moveZ -= touchMove.y;
      }

      const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      inputDir.applyAxisAngle(yAxis, cameraAngle.current.yaw);

      // Smoothly rotate player toward movement direction
      const targetRotationY = Math.atan2(inputDir.x, inputDir.z);
      const diff =
        THREE.MathUtils.euclideanModulo(
          targetRotationY - player.rotation.y + Math.PI,
          Math.PI * 2
        ) - Math.PI;
      player.rotation.y += diff * Math.min(1, delta * 14);

      // --- SOLID MULTI-DIRECTIONAL WALL COLLISION & SLIDING ---
      const checkHeights = performanceMode ? [0.85] : [0.55, 1.1];

      // 1. Push-back: prevent penetration into walls from all 8 surrounding directions
      for (const h of checkHeights) {
        const origin = new THREE.Vector3(player.position.x, player.position.y + h, player.position.z);
        for (const dir of radialDirs) {
          obstacleRaycaster.set(origin, dir);
          obstacleRaycaster.far = MIN_WALL_DIST;
          const hits = obstacleRaycaster.intersectObjects(obstacles, !hasCachedObstacles);
          const obstacleHit = hits.find(
            (hit) => hit.object.userData?.isObstacle && hit.distance < MIN_WALL_DIST
          );
          if (obstacleHit) {
            const pushDist = (MIN_WALL_DIST - obstacleHit.distance) * 0.5;
            player.position.addScaledVector(dir, -pushDist);
          }
        }
      }

      // 2. Wall sliding: cancel velocity component pointing into nearby walls
      const moveVector = inputDir.clone().multiplyScalar(moveSpeed * delta);
      const chestOrigin = new THREE.Vector3(player.position.x, player.position.y + 0.85, player.position.z);

      for (const dir of radialDirs) {
        const dot = moveVector.dot(dir);
        if (dot > 0) {
          obstacleRaycaster.set(chestOrigin, dir);
          obstacleRaycaster.far = MIN_WALL_DIST + 0.35;
          const hits = obstacleRaycaster.intersectObjects(obstacles, !hasCachedObstacles);
          const hit = hits.find(
            (h) => h.object.userData?.isObstacle && h.distance < MIN_WALL_DIST + 0.35
          );
          if (hit) {
            moveVector.addScaledVector(dir, -dot);
          }
        }
      }

      // 3. Final forward path verification before applying movement
      if (moveVector.lengthSq() > 0.00001) {
        const moveDir = moveVector.clone().normalize();
        const moveLen = moveVector.length();

        let maxAllowedDist = moveLen;
        for (const h of checkHeights) {
          const rayOrigin = new THREE.Vector3(player.position.x, player.position.y + h, player.position.z);
          obstacleRaycaster.set(rayOrigin, moveDir);
          obstacleRaycaster.far = moveLen + MIN_WALL_DIST;
          const forwardHits = obstacleRaycaster.intersectObjects(obstacles, !hasCachedObstacles);
          const forwardHit = forwardHits.find(
            (h) => h.object.userData?.isObstacle && h.distance < moveLen + MIN_WALL_DIST
          );
          if (forwardHit) {
            const safeDist = Math.max(0, forwardHit.distance - MIN_WALL_DIST);
            if (safeDist < maxAllowedDist) {
              maxAllowedDist = safeDist;
            }
          }
        }

        if (maxAllowedDist > 0.001) {
          player.position.addScaledVector(moveDir, maxAllowedDist);
        }
      }

      // Keep within map boundaries
      player.position.x = Math.max(-100, Math.min(100, player.position.x));
      player.position.z = Math.max(-125, Math.min(125, player.position.z));
    }

    // Ground raycasting: use cached ground/road meshes for fast check
    const hasCachedGround = groundMeshesRef.current.length > 0;
    const groundTargets = hasCachedGround ? groundMeshesRef.current : scene.children;
    const downOrigin = new THREE.Vector3(player.position.x, player.position.y + 3, player.position.z);
    downRaycaster.set(downOrigin, downDir);
    const groundHits = downRaycaster.intersectObjects(groundTargets, !hasCachedGround);
    const validGround = groundHits.find(
      (hit) =>
        (hit.object.userData?.isGround === true || hit.object.userData?.isRoad === true) &&
        !hit.object.userData?.isObstacle
    );

    const targetY = validGround ? validGround.point.y : 0;
    player.position.y = THREE.MathUtils.lerp(player.position.y, Math.max(0, targetY), 0.3);

    // Goal and distance calculations (only update store when integer changes)
    const dist = Math.round(
      Math.hypot(player.position.x - GOAL_POS[0], player.position.z - GOAL_POS[2])
    );
    if (dist !== lastDistRef.current) {
      lastDistRef.current = dist;
      setDistanceToGoal(dist);
    }

    const totalZ = GOAL_POS[2] - START_POS[2];
    const currentZ = player.position.z - START_POS[2];
    const pct = Math.min(100, Math.max(0, Math.round((currentZ / totalZ) * 100)));
    if (pct !== lastPctRef.current) {
      lastPctRef.current = pct;
      setProgressPercent(pct);
    }

    // Reached the school!
    if (dist < 6.5 && !gameWon) {
      setGameWon(true);
    }

    // Check proximity to Zusana (Suzanne monkey head from Blender, now smaller)
    if (!foundSuzanne && suzannePos) {
      const distToSuzanne = Math.hypot(
        player.position.x - suzannePos[0],
        player.position.z - suzannePos[2]
      );
      if (distToSuzanne < 4.0) {
        setFoundSuzanne(true);
        setShowSuzanneModal(true);
      }
    }

    // Third-person camera with full vertical look (up/down) and distance control
    const targetDist = camDistTarget.current || 1.65;
    const pitch = cameraAngle.current.pitch;
    const yaw = cameraAngle.current.yaw;

    // Raise lookTarget when pitch < 0 so looking up tilts the camera toward upper floors and sky
    const upwardLookBoost = pitch < 0 ? Math.sin(-pitch) * 2.0 : 0;
    const lookTarget = new THREE.Vector3(
      player.position.x,
      player.position.y + 1.25 + upwardLookBoost,
      player.position.z
    );

    const camOffset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * targetDist,
      Math.sin(pitch) * targetDist,
      Math.cos(yaw) * Math.cos(pitch) * targetDist
    );

    // Camera occlusion: pull camera forward if a building is directly behind the character
    let actualCamDist = targetDist;
    const camRayDir = camOffset.clone().normalize();
    obstacleRaycaster.set(lookTarget, camRayDir);
    obstacleRaycaster.far = targetDist;
    const camHits = obstacleRaycaster.intersectObjects(obstacles, !hasCachedObstacles);
    const camWallHit = camHits.find((h) => h.object.userData?.isObstacle && h.distance < targetDist);
    if (camWallHit) {
      actualCamDist = Math.max(0.65, camWallHit.distance - 0.2);
    }

    const desiredCamPos = lookTarget.clone().addScaledVector(camRayDir, actualCamDist);
    // Keep camera above street level when looking straight up
    desiredCamPos.y = Math.max(player.position.y + 0.25, desiredCamPos.y);

    camera.position.lerp(desiredCamPos, 0.25);
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={START_POS} dispose={null}>
      <primitive object={walkGltf.scene} scale={1} />
    </group>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/caminar.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/correr.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/ganar.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/muerto.glb`);
