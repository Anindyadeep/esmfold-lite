import React from 'react';
import { Molecule } from '@/utils/pdbParser';
import { Card } from './ui/card';
import { Separator } from './ui/separator';

interface MoleculeStats {
  totalAtoms: number;
  uniqueElements: string[];
  residueCounts: { [key: string]: number };
  chainInfo: {
    chainId: string;
    residueCount: number;
    atomCount: number;
  }[];
  waterCount: number;
  ionCount: number;
}

const calculateMoleculeStats = (molecule: Molecule): MoleculeStats => {
  const stats: MoleculeStats = {
    totalAtoms: molecule.atoms.length,
    uniqueElements: [],
    residueCounts: {},
    chainInfo: [],
    waterCount: 0,
    ionCount: 0
  };

  // Temporary sets and maps for calculations
  const elements = new Set<string>();
  const chainMap = new Map<string, { residues: Set<number>, atoms: number }>();

  // Process each atom
  molecule.atoms.forEach(atom => {
    // Count unique elements
    elements.add(atom.element);

    // Count residues
    if (!stats.residueCounts[atom.residue]) {
      stats.residueCounts[atom.residue] = 0;
    }
    stats.residueCounts[atom.residue]++;

    // Process chain information
    if (!chainMap.has(atom.chain)) {
      chainMap.set(atom.chain, { residues: new Set(), atoms: 0 });
    }
    const chainInfo = chainMap.get(atom.chain)!;
    chainInfo.residues.add(atom.residueId);
    chainInfo.atoms++;

    // Count water and ions
    if (atom.residue === 'HOH' || atom.residue === 'WAT') {
      stats.waterCount++;
    } else if (atom.residue.length <= 2 && !atom.residue.match(/[a-z]/i)) {
      stats.ionCount++;
    }
  });

  // Convert chain map to array
  stats.chainInfo = Array.from(chainMap.entries()).map(([chainId, info]) => ({
    chainId,
    residueCount: info.residues.size,
    atomCount: info.atoms
  }));

  // Sort chains by ID
  stats.chainInfo.sort((a, b) => a.chainId.localeCompare(b.chainId));

  // Convert elements set to sorted array
  stats.uniqueElements = Array.from(elements).sort();

  return stats;
};

interface StructureDetailsProps {
  molecule: Molecule;
  distogram?: number[][];
}

export function StructureDetails({ molecule, distogram }: StructureDetailsProps) {
  const stats = calculateMoleculeStats(molecule);

  return (
    <div className="space-y-6">
      {/* Atom Statistics */}
      <div>
        <h4 className="text-sm font-medium mb-2">Atom Statistics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Atoms</p>
            <p className="font-medium">{stats.totalAtoms}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unique Elements</p>
            <p className="font-medium">{stats.uniqueElements.join(', ')}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Chain Information */}
      <div>
        <h4 className="text-sm font-medium mb-2">Chain Information</h4>
        <div className="grid grid-cols-4 gap-4 text-sm font-medium mb-2">
          <div>Chain</div>
          <div>Residues</div>
          <div>Atoms</div>
          <div>% of Total</div>
        </div>
        {stats.chainInfo.map(chain => (
          <div key={chain.chainId} className="grid grid-cols-4 gap-4 text-sm">
            <div>{chain.chainId}</div>
            <div>{chain.residueCount}</div>
            <div>{chain.atomCount}</div>
            <div>
              {((chain.atomCount / stats.totalAtoms) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Water and Ion Information */}
      <div>
        <h4 className="text-sm font-medium mb-2">Water and Ion Content</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Water Molecules</p>
            <p className="font-medium">{stats.waterCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Ion Count</p>
            <p className="font-medium">{stats.ionCount}</p>
          </div>
        </div>
      </div>

      {/* Distogram Visualization */}
      {distogram && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Distogram</h4>
            <Card className="p-4 bg-muted">
              {/* TODO: Add actual distogram visualization */}
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Distogram visualization coming soon...
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 