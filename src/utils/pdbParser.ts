
export interface Atom {
  id: number;
  element: string;
  residue: string;
  chain: string;
  position: [number, number, number]; // [x, y, z]
  residueId: number;
}

export interface Molecule {
  id: string;
  name: string;
  atoms: Atom[];
}

/**
 * A basic PDB parser that extracts atom information from PDB files
 */
export const parsePDB = async (file: File): Promise<Molecule> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (!event.target || typeof event.target.result !== 'string') {
          throw new Error('Failed to read file');
        }
        
        const content = event.target.result;
        // Handle different line endings (Windows: \r\n, Unix: \n, Old Mac: \r)
        const lines = content.split(/\r\n|\n|\r/);
        const atoms: Atom[] = [];
        
        console.log(`Parsing PDB file: ${file.name} with ${lines.length} lines`);
        
        // Parse ATOM and HETATM records from PDB file
        let atomCount = 0;
        for (const line of lines) {
          if (line.startsWith('ATOM  ') || line.startsWith('HETATM')) {
            atomCount++;
            try {
              // PDB format is fixed-width, so we can extract information by character position
              const id = parseInt(line.substring(6, 11).trim());
              // Some PDB files store element in columns 76-78, others in 13-14
              let element = line.substring(76, 78).trim();
              if (!element) {
                // Try alternative location for element (atom name field)
                element = line.substring(12, 14).trim();
              }
              const residue = line.substring(17, 20).trim();
              const chain = line.substring(21, 22).trim();
              const residueId = parseInt(line.substring(22, 26).trim());
              
              const x = parseFloat(line.substring(30, 38).trim());
              const y = parseFloat(line.substring(38, 46).trim());
              const z = parseFloat(line.substring(46, 54).trim());
              
              // Skip atoms with invalid coordinates
              if (isNaN(x) || isNaN(y) || isNaN(z)) {
                console.warn(`Skipping atom with invalid coordinates: ${line}`);
                continue;
              }
              
              atoms.push({
                id,
                element,
                residue,
                chain,
                position: [x, y, z],
                residueId,
              });
            } catch (atomError) {
              console.warn(`Error parsing atom line: ${line}`, atomError);
            }
          }
        }
        
        console.log(`Parsed ${atoms.length} atoms from ${atomCount} atom records`);
        
        if (atoms.length === 0) {
          console.warn(`No atoms found in file: ${file.name}`);
          console.log(`First few lines of file:`, lines.slice(0, 10));
        }
        
        // Create molecule object
        const molecule: Molecule = {
          id: file.name,
          name: file.name.replace('.pdb', ''),
          atoms,
        };
        
        resolve(molecule);
      } catch (error) {
        console.error('Error parsing PDB file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
