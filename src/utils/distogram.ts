import { Molecule, Atom } from './pdbParser';

/**
 * Calculate the Euclidean distance between two atoms
 */
function calculateDistance(atom1: Atom, atom2: Atom): number {
  const dx = atom1.position[0] - atom2.position[0];
  const dy = atom1.position[1] - atom2.position[1];
  const dz = atom1.position[2] - atom2.position[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate the residue-residue distance matrix for a molecule
 * @param molecule The molecule to calculate the distance matrix for
 * @returns A 2D array representing the minimum distances between residues
 */
export function calculateDistogram(molecule: Molecule): number[][] {
  // Group atoms by residue
  const residues = new Map<number, Atom[]>();
  
  molecule.atoms.forEach(atom => {
    if (!residues.has(atom.residueId)) {
      residues.set(atom.residueId, []);
    }
    residues.get(atom.residueId)!.push(atom);
  });

  // Sort residue IDs
  const residueIds = Array.from(residues.keys()).sort((a, b) => a - b);
  
  // Initialize distance matrix
  const distogram: number[][] = Array(residueIds.length).fill(0)
    .map(() => Array(residueIds.length).fill(0));

  // Calculate minimum distances between residues
  for (let i = 0; i < residueIds.length; i++) {
    const residue1Atoms = residues.get(residueIds[i])!;
    
    for (let j = i; j < residueIds.length; j++) {
      const residue2Atoms = residues.get(residueIds[j])!;
      
      // Find minimum distance between any atoms in the two residues
      let minDistance = Infinity;
      
      for (const atom1 of residue1Atoms) {
        for (const atom2 of residue2Atoms) {
          const distance = calculateDistance(atom1, atom2);
          minDistance = Math.min(minDistance, distance);
        }
      }
      
      // Store the distance in both halves of the matrix (it's symmetric)
      distogram[i][j] = minDistance;
      distogram[j][i] = minDistance;
    }
  }

  return distogram;
} 