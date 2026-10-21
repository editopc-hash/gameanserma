import React, { useEffect, useRef, useMemo } from "react";
import { useGLTF, Html, Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { START_POS, GOAL_POS, useGameStore } from "@/state/gameStore";

const BUILDING_COLORS = [
  "#f8fafc", // White/light stone
  "#e2e8f0", // Clean concrete
  "#cbd5e1", // Slate modern
  "#fed7aa", // Warm orange plaster
  "#fef08a", // Soft colonial yellow
  "#bae6fd", // Sky blue facade
  "#bbf7d0", // Light mint green
  "#ddd6fe", // Light lavender
  "#fbcfe8", // Soft rose pink
  "#fdba74", // Terracotta light
];

export function Map() {
  const modelUrl = `${import.meta.env.BASE_URL}models/mapa.glb`;
  const { scene } = useGLTF(modelUrl);
  const mapRef = useRef<THREE.Group>(null);
  const setSuzannePos = useGameStore((s) => s.setSuzannePos);
  const foundSuzanne = useGameStore((s) => s.foundSuzanne);

  // Center the map at [0, 0, 0]
  const offset = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    if (!scene) return;

    let meshIndex = 0;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Check if this mesh or any parent is Suzanne / Zusana
        const isSuzanne =
          mesh.name.toLowerCase().includes("suzanne") ||
          mesh.name.toLowerCase().includes("mono") ||
          mesh.name.toLowerCase().includes("zusana") ||
          child.parent?.name.toLowerCase().includes("suzanne");

        if (isSuzanne) {
          // Suzanne / Zusana: Golden Blender monkey trophy
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#f59e0b",
            metalness: 0.85,
            roughness: 0.25,
            emissive: "#b45309",
            emissiveIntensity: 0.35,
          });
          mesh.userData.isSuzanne = true;
          mesh.userData.isObstacle = false;

          // Compute exact world position
          const worldPos = new THREE.Vector3();
          mesh.getWorldPosition(worldPos);
          setSuzannePos([worldPos.x, worldPos.y, worldPos.z]);
          return;
        }

        mesh.geometry.computeBoundingBox();
        const geomBox = mesh.geometry.boundingBox;
        let isBuilding = true;

        if (geomBox) {
          const dy = geomBox.max.y - geomBox.min.y;
          const dz = geomBox.max.z - geomBox.min.z;
          const height = Math.max(dy, dz);
          if (height < 0.25) {
            isBuilding = false;
          }
        }

        // Preserve any custom textures created in Blender
        const hasTexture = Boolean((mesh.material as any)?.map);

        if (hasTexture) {
          mesh.userData.isObstacle = isBuilding;
          mesh.userData.isGround = !isBuilding;
          if (mesh.material) {
            (mesh.material as THREE.Material).side = THREE.DoubleSide;
          }
        } else if (isBuilding) {
          const color = BUILDING_COLORS[meshIndex % BUILDING_COLORS.length];
          mesh.material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.65,
            metalness: 0.1,
            flatShading: false,
            side: THREE.DoubleSide, // Ensure both front and back faces block rays
          });
          mesh.userData.isObstacle = true;
          mesh.userData.isGround = false;
        } else {
          // Roads / pedestrian paths
          mesh.material = new THREE.MeshStandardMaterial({
            color: "#1c2128", // Rich dark asphalt
            roughness: 0.85,
            metalness: 0.05,
          });
          mesh.userData.isRoad = true;
          mesh.userData.isGround = true;
          mesh.userData.isObstacle = false;
        }

        meshIndex++;
      }
    });
  }, [scene, offset, setSuzannePos]);

  return (
    <group ref={mapRef} position={offset}>
      {/* The user's updated mapa.glb */}
      <primitive object={scene} />

      {/* Ground plane for infinite horizon */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
        userData={{ isGround: true, isObstacle: false }}
      >
        <planeGeometry args={[1200, 1200]} />
        <meshStandardMaterial
          color="#151b23"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>

      {/* Checkpoint: Parque Principal (Inicio) */}
      <group position={[START_POS[0] - offset.x, 0.05, START_POS[2] - offset.z]}>
        {/* Spawn park plaza ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[9, 32]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.7} />
        </mesh>
        {/* Glowing border ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[3.8, 4.4, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
        </mesh>

        {/* 3D Billboard text: large and legible from any camera angle on mobile */}
        <Billboard position={[0, 4.2, 0]}>
          <Text
            fontSize={1.2}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="#0f172a"
          >
            📍 Parque Principal de Anserma
          </Text>
        </Billboard>

        {/* HTML Badge fallback with large, legible styling */}
        <Html position={[0, 2.6, 0]} center distanceFactor={32}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              color: "#38bdf8",
              padding: "8px 18px",
              borderRadius: "24px",
              fontWeight: 800,
              fontSize: "15px",
              border: "2px solid #38bdf8",
              boxShadow: "0 0 25px rgba(56, 189, 248, 0.7)",
              whiteSpace: "nowrap",
              userSelect: "none",
              pointerEvents: "none",
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            🌳 Parque Principal (Inicio)
          </div>
        </Html>
      </group>

      {/* Checkpoint: Colegio (Meta) */}
      <group position={[GOAL_POS[0] - offset.x, 0.05, GOAL_POS[2] - offset.z]}>
        {/* Goal plaza ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[8, 32]} />
          <meshStandardMaterial color="#3b4252" roughness={0.8} />
        </mesh>
        {/* Glowing goal ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[3.2, 4.0, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.9} />
        </mesh>

        {/* 3D Billboard text for Goal */}
        <Billboard position={[0, 4.2, 0]}>
          <Text
            fontSize={1.2}
            color="#facc15"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="#0f172a"
          >
            🏫 Colegio de Occidente (Meta)
          </Text>
        </Billboard>

        <Html position={[0, 2.6, 0]} center distanceFactor={32}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.92)",
              color: "#facc15",
              padding: "8px 18px",
              borderRadius: "24px",
              fontWeight: 800,
              fontSize: "15px",
              border: "2px solid #facc15",
              boxShadow: "0 0 25px rgba(250, 204, 21, 0.8)",
              whiteSpace: "nowrap",
              userSelect: "none",
              pointerEvents: "none",
              textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            🏫 Colegio de Occidente (Meta)
          </div>
        </Html>
      </group>
    </group>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/mapa.glb`);
