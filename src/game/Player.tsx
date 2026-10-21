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
    () => new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0, 4.0),
    []
  );

  // Cache building obstacle meshes for ultra-fast and reliable collision
  const obstacleMeshesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    const updateObstacles = () => {
      const list: THREE.Mesh[] = [];
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.userData?.isObstacle) {
          list.push(child as THREE.Mesh);
        }
      });
      if (list.length > 0) {
        obstacleMeshesRef.current = list;
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

    // Wheel zoom for PC
    const onWheel = (e: WheelEvent) => {
      const next = Math.max(1.1, Math.min(3.2, camDistTarget.current + e.deltaY * 0.002));
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
          const next = Math.max(1.1, Math.min(3.2, camDistTarget.current + diff * 0.006));
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

  // Frame update
  useFrame((_, delta) => {
    if (!group.current) return;

    const player = group.current;

    // Timer update
    if (!gameWon && startTime) {
      setTimeElapsed((Date.now() - startTime) / 1000);
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
    setSpeed(moveSpeed);

    const obstacles = obstacleMeshesRef.current.length > 0 ? obstacleMeshesRef.current : scene.children;
    const MIN_WALL_DIST = 1.15; // Generous collision boundary: stops player cleanly outside walls

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

      // --- SOLID MULTI-DIRECTIONAL WALL COLLISION & SLIDING ---
      const checkHeights = [0.55, 1.1]; // waist and chest heights
      const radialDirs = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0.707, 0, 0.707),
        new THREE.Vector3(-0.707, 0, 0.707),
        new THREE.Vector3(0.707, 0, -0.707),
        new THREE.Vector3(-0.707, 0, -0.707),
      ];

      // 1. Push-back: prevent ANY penetration into walls from all 8 surrounding directions
      for (const h of checkHeights) {
        const origin = player.position.clone().add(new THREE.Vector3(0, h, 0));
        for (const dir of radialDirs) {
          obstacleRaycaster.set(origin, dir);
          obstacleRaycaster.far = MIN_WALL_DIST;
          const hits = obstacleRaycaster.intersectObjects(obstacles, true);
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
      let moveVector = inputDir.clone().multiplyScalar(moveSpeed * delta);
      const chestOrigin = player.position.clone().add(new THREE.Vector3(0, 0.85, 0));

      for (const dir of radialDirs) {
        const dot = moveVector.dot(dir);
        if (dot > 0) {
          obstacleRaycaster.set(chestOrigin, dir);
          obstacleRaycaster.far = MIN_WALL_DIST + 0.35;
          const hits = obstacleRaycaster.intersectObjects(obstacles, true);
          const hit = hits.find(
            (h) => h.object.userData?.isObstacle && h.distance < MIN_WALL_DIST + 0.35
          );
          if (hit) {
            // Cancel movement into the wall, keeping only tangent component
            moveVector.sub(dir.clone().multiplyScalar(dot));
          }
        }
      }

      // 3. Final forward path verification before applying movement
      if (moveVector.lengthSq() > 0.00001) {
        const moveDir = moveVector.clone().normalize();
        const moveLen = moveVector.length();

        let maxAllowedDist = moveLen;
        for (const h of checkHeights) {
          const rayOrigin = player.position.clone().add(new THREE.Vector3(0, h, 0));
          obstacleRaycaster.set(rayOrigin, moveDir);
          obstacleRaycaster.far = moveLen + MIN_WALL_DIST;
          const forwardHits = obstacleRaycaster.intersectObjects(obstacles, true);
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

    // Close third-person camera (default 1.65m - character is close and prominent)
    const targetDist = camDistTarget.current || 1.65;
    const camOffset = new THREE.Vector3(
      Math.sin(cameraAngle.current.yaw) *
        Math.cos(cameraAngle.current.pitch) *
        targetDist,
      Math.sin(cameraAngle.current.pitch) * targetDist + 0.45,
      Math.cos(cameraAngle.current.yaw) *
        Math.cos(cameraAngle.current.pitch) *
        targetDist
    );

    const lookTarget = player.position
      .clone()
      .add(new THREE.Vector3(0, 1.15, 0));

    // Camera occlusion: pull camera forward if a building is directly behind the character
    let actualCamDist = targetDist;
    const camRayDir = camOffset.clone().normalize();
    obstacleRaycaster.set(lookTarget, camRayDir);
    obstacleRaycaster.far = targetDist;
    const camHits = obstacleRaycaster.intersectObjects(obstacles, true);
    const camWallHit = camHits.find((h) => h.object.userData?.isObstacle && h.distance < targetDist);
    if (camWallHit) {
      actualCamDist = Math.max(0.75, camWallHit.distance - 0.2);
    }

    const desiredCamPos = lookTarget.clone().add(camRayDir.multiplyScalar(actualCamDist));
    camera.position.lerp(desiredCamPos, 0.22);
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
