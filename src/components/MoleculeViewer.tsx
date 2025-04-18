
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Molecule, Atom } from '@/utils/pdbParser';
import { ViewMode } from './ViewControls';

interface MoleculeViewerProps {
  molecule?: Molecule;
  viewMode: ViewMode;
  atomSize: number;
  colorScheme: string[];
}

// Color schemes based on elements
const elementColors: Record<string, string> = {
  H: '#FFFFFF', // White
  C: '#909090', // Gray
  N: '#3050F8', // Blue
  O: '#FF0D0D', // Red
  P: '#FF8000', // Orange
  S: '#FFFF30', // Yellow
  Cl: '#1FF01F', // Green
  F: '#90E050', // Light green
  Br: '#A62929', // Brown
  I: '#940094', // Purple
  He: '#D9FFFF',
  Li: '#CC80FF',
  Be: '#C2FF00',
  B: '#FFB5B5',
  Ne: '#B3E3F5',
  Na: '#AB5CF2',
  Mg: '#8AFF00',
  Al: '#BFA6A6',
  Si: '#F0C8A0',
  Ar: '#80D1E3',
  K: '#8F40D4',
  Ca: '#3DFF00',
  default: '#797979', // Default gray
};

// Helper function to get color for an element
const getElementColor = (element: string, colorScheme: string[]): string => {
  const cleanElement = element.trim().replace(/[0-9]/g, '');
  return elementColors[cleanElement] || elementColors['default'];
};

// Component to render a single atom
const AtomInstance: React.FC<{
  position: [number, number, number];
  element: string;
  size: number;
  colorScheme: string[];
}> = ({ position, element, size, colorScheme }) => {
  const color = getElementColor(element, colorScheme);
  
  return (
    <mesh position={position}>
      <sphereGeometry args={[size * 0.5, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Component to render a bond between atoms
const Bond: React.FC<{
  start: [number, number, number];
  end: [number, number, number];
  colorScheme: string[];
}> = ({ start, end, colorScheme }) => {
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  
  // Calculate the direction and length of the bond
  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  );
  const length = direction.length();
  
  // Create a quaternion for rotation
  direction.normalize();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction
  );
  
  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry args={[0.1, 0.1, length, 8]} />
      <meshStandardMaterial color={colorScheme[0]} />
    </mesh>
  );
};

// Custom scene setup
const Scene: React.FC<{
  molecule?: Molecule;
  viewMode: ViewMode;
  atomSize: number;
  colorScheme: string[];
}> = ({ molecule, viewMode, atomSize, colorScheme }) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  // Center the molecule on load
  useEffect(() => {
    if (molecule && groupRef.current) {
      // Calculate the center of the molecule
      const bbox = new THREE.Box3().setFromObject(groupRef.current);
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      
      // Move the group so the center is at origin
      groupRef.current.position.sub(center);
      
      // Set camera position based on molecule size
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.set(0, 0, maxDim * 2.5);
      camera.lookAt(0, 0, 0);
    }
  }, [molecule, camera]);

  // Create bonds between atoms that are within a certain distance
  const bonds = useMemo(() => {
    if (!molecule || viewMode !== 'ball-stick') return [];
    
    const result = [];
    const atoms = molecule.atoms;
    
    const cutoffDistance = 3; // Å, typical bond length cutoff
    
    // Simple O(n²) approach for demo purposes
    // A more efficient algorithm would use spatial partitioning
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const atomA = atoms[i];
        const atomB = atoms[j];
        
        const dx = atomA.position[0] - atomB.position[0];
        const dy = atomA.position[1] - atomB.position[1];
        const dz = atomA.position[2] - atomB.position[2];
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < cutoffDistance) {
          result.push({ 
            id: `${atomA.id}-${atomB.id}`,
            start: atomA.position,
            end: atomB.position
          });
        }
      }
    }
    
    return result;
  }, [molecule, viewMode]);

  if (!molecule) {
    return (
      <Text
        position={[0, 0, 0]}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Upload and select a .pdb file to view
      </Text>
    );
  }

  return (
    <group ref={groupRef}>
      {molecule.atoms.map((atom) => (
        <AtomInstance
          key={atom.id}
          position={atom.position}
          element={atom.element}
          size={atomSize}
          colorScheme={colorScheme}
        />
      ))}
      
      {bonds.map((bond) => (
        <Bond
          key={bond.id}
          start={bond.start}
          end={bond.end}
          colorScheme={colorScheme}
        />
      ))}
    </group>
  );
};

const MoleculeViewer: React.FC<MoleculeViewerProps> = ({ 
  molecule, 
  viewMode, 
  atomSize,
  colorScheme
}) => {
  return (
    <div className="w-full h-full rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 50], fov: 40 }}
        className="bg-gray-900"
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={1}
          castShadow
        />
        <Scene 
          molecule={molecule} 
          viewMode={viewMode} 
          atomSize={atomSize}
          colorScheme={colorScheme}
        />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
        <Stats />
      </Canvas>
    </div>
  );
};

export default MoleculeViewer;
