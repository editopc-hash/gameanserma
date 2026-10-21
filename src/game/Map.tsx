import { useEffect, useMemo, useRef } from "react";
import { useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { START_POS, GOAL_POS, useGameStore } from "@/state/gameStore";

const BUILDING_COLORS = [
  "#f1ece4", // Warm stucco
  "#e2d8ce", // Sandstone
  "#d4c5b9", // Desert stone
  "#b0a495", // Classic concrete
  "#c8b6a6", // Soft brick
  "#94a3b8", // Modern slate
  "#64748b", // Deep slate
  "#818cf8", // Subtle blue accent
  "#cbd5e1", // Cool light gray
  "#fed7aa", // Warm clay
  "#d1d5db", // Light stone
];

export function Map() {
  const modelUrl = `${import.meta.env.BASE_URL}models/mapa.glb`;
  const { scene } = useGLTF(modelUrl);
  const mapRef = useRef<THREE.Group>(null);
  const setSuzannePos = useGameStore((s) => s.setSuzannePos);
  const foundSuzanne = useGameStore((s) => s.foundSuzanne);

  // Exact town center calculated from Anserma building footprints
  const offset = useMemo(() => new THREE.Vector3(-4.58, 0, -4.83), []);

  useEffect(() => {
    let meshIndex = 0;

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

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
            emissiveIntensity: 0.2,
          });
          mesh.userData.isSuzanne = true;
          mesh.userData.isObstacle = false;

          // Compute world position after group offset
          const worldPos = new THREE.Vector3();
          mesh.getWorldPosition(worldPos);
          setSuzannePos([
            worldPos.x + offset.x,
            worldPos.y + offset.y,
            worldPos.z + offset.z,
          ]);
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
        } else if (isBuilding) {
          const color = BUILDING_COLORS[meshIndex % BUILDING_COLORS.length];
          mesh.material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.65,
            metalness: 0.1,
            flatShading: false,
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
        }

        meshIndex++;
      }
    });
  }, [scene, offset, setSuzannePos]);

  return (
    <group ref={mapRef} position={offset}>
      {/* Only load the user's updated mapa.glb */}
      <primitive object={scene} />

      {/* Base street and pavement level */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        userData={{ isGround: true }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial
          color="#1e2329"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Checkpoint: Parque Principal (Inicio) */}
      <group position={[START_POS[0] - offset.x, 0.05, START_POS[2] - offset.z]}>
        {/* Plaza green zone */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[9, 32]} />
          <meshStandardMaterial color="#2d5a27" roughness={0.8} />
        </mesh>
        {/* Checkpoint glowing ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[2.5, 3.2, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>

        <Html position={[0, 3.2, 0]} center distanceFactor={22}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              color: "#38bdf8",
              padding: "6px 14px",
              borderRadius: "20px",
              fontWeight: 700,
              fontSize: "12px",
              border: "2px solid #38bdf8",
              boxShadow: "0 0 15px rgba(56, 189, 248, 0.6)",
              whiteSpace: "nowrap",
              userSelect: "none",
              pointerEvents: "none",
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

        <Html position={[0, 3.5, 0]} center distanceFactor={22}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.9)",
              color: "#facc15",
              padding: "8px 16px",
              borderRadius: "20px",
              fontWeight: 800,
              fontSize: "13px",
              border: "2px solid #facc15",
              boxShadow: "0 0 20px rgba(250, 204, 21, 0.8)",
              whiteSpace: "nowrap",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            🏫 Colegio de Occidente (Meta 🏆)
          </div>
        </Html>
      </group>
    </group>
  );
}

useGLTF.preload(`${import.meta.env.BASE_URL}models/mapa.glb`);
