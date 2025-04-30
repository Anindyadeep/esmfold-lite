/**
 * Parse PDB string to extract CA atom coordinates
 */
export function parsePDB(pdbContent: string): number[][] {
    if (!pdbContent) {
        console.warn('Empty PDB content');
        return [];
    }
    
    const lines = pdbContent.split('\n');
    const coords: number[][] = [];
    
    console.log(`Parsing PDB with ${lines.length} lines`);
    
    for (const line of lines) {
        // Look for CA atoms in ATOM records
        if (line.startsWith("ATOM") && line.substr(12, 4).trim() === "CA") {
            try {
                const x = parseFloat(line.substr(30, 8));
                const y = parseFloat(line.substr(38, 8));
                const z = parseFloat(line.substr(46, 8));
                
                // Validate the parsed values
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    coords.push([x, y, z]);
                }
            } catch (e) {
                console.warn('Error parsing atom line:', line);
            }
        }
    }
    
    console.log(`Extracted ${coords.length} CA atom coordinates`);
    return coords;
}

/**
 * Calculate TM-score between predicted and true coordinates
 * TM-score measures the similarity of protein structures
 */
export function calculateTMScore(predCoords: number[][], trueCoords: number[][]): number {
    if (predCoords.length === 0 || trueCoords.length === 0) {
        console.error("Empty coordinate arrays");
        return 0;
    }
    
    if (predCoords.length !== trueCoords.length) {
        console.error(`Coordinate arrays have different lengths: ${predCoords.length} vs ${trueCoords.length}`);
        // Use the smaller length
        const minLength = Math.min(predCoords.length, trueCoords.length);
        predCoords = predCoords.slice(0, minLength);
        trueCoords = trueCoords.slice(0, minLength);
    }

    const L_target = trueCoords.length;

    // Compute d0
    let d0 = 1.24 * Math.pow(L_target - 15, 1/3) - 1.8;
    d0 = Math.max(d0, 0.5); // safeguard

    let scoreSum = 0;
    let validPoints = 0;

    for (let i = 0; i < L_target; i++) {
        try {
            const dx = predCoords[i][0] - trueCoords[i][0];
            const dy = predCoords[i][1] - trueCoords[i][1];
            const dz = predCoords[i][2] - trueCoords[i][2];

            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Skip invalid distances
            if (isNaN(dist) || !isFinite(dist)) {
                continue;
            }
            
            scoreSum += 1 / (1 + Math.pow(dist / d0, 2));
            validPoints++;
        } catch (e) {
            console.warn(`Error calculating distance for atom ${i}`);
        }
    }

    // If we have no valid points, return 0
    if (validPoints === 0) {
        console.error("No valid points for TM-score calculation");
        return 0;
    }

    // Calculate TM-score using only valid points
    const tmScore = scoreSum / L_target;
    
    // Safeguard against NaN or infinite values
    if (isNaN(tmScore) || !isFinite(tmScore)) {
        console.error("TM-score calculation resulted in an invalid value");
        return 0;
    }
    
    return tmScore;
}

// Helper function to validate a coordinate
function isValidCoord(coord: number[]): boolean {
    if (!coord || !Array.isArray(coord) || coord.length !== 3) {
        return false;
    }
    
    // Check that all values are numbers and finite
    return coord.every(val => typeof val === 'number' && isFinite(val) && !isNaN(val));
}

/**
 * Extract coordinates from molecule
 */
export function extractCoordinates(molecule: any): number[][] {
    if (!molecule || !molecule.atoms) {
        console.warn('No atoms found in molecule');
        return [];
    }
    
    console.log(`Total atoms in molecule: ${molecule.atoms.length}`);
    
    // Check for CA atoms with various possible naming conventions
    const caAtoms = molecule.atoms
        .filter((atom: any) => {
            // Check different possible CA atom naming conventions
            const isCA = 
                atom.name === 'CA' || 
                atom.name === 'C-alpha' ||
                (atom.element === 'C' && atom.name?.includes('A'));
                
            // Debug logging for the first few atoms
            if (atom.index < 10) {
                console.log(`Atom ${atom.index}: ${atom.name} (${atom.element}) - isCA: ${isCA}`);
            }
            
            return isCA;
        })
        .sort((a: any, b: any) => a.residueId - b.residueId);
    
    console.log(`Found ${caAtoms.length} CA atoms`);
    
    // If no CA atoms found, try to use all carbon atoms as a fallback
    if (caAtoms.length === 0) {
        console.warn('No CA atoms found, using backbone atoms as fallback');
        // Try to get backbone atoms (C, N, O) from each residue
        const backboneAtoms = molecule.atoms
            .filter((atom: any) => 
                ['C', 'N', 'O'].includes(atom.element) && 
                !['HOH', 'WAT'].includes(atom.residue)
            )
            .sort((a: any, b: any) => a.residueId - b.residueId);
            
        if (backboneAtoms.length > 0) {
            console.log(`Using ${backboneAtoms.length} backbone atoms instead`);
            return backboneAtoms.map((atom: any) => [atom.x, atom.y, atom.z]);
        }
    }
    
    // Extract coordinates
    const coordinates = caAtoms.map((atom: any) => [atom.x, atom.y, atom.z]);
    
    // Quick validation check for the extracted coordinates
    if (coordinates.length > 0) {
        // Check if we have any invalid coordinates
        const hasInvalidCoordinates = coordinates.some(coord => 
            !coord || 
            coord.length !== 3 || 
            coord.some(val => val === undefined || val === null || isNaN(val) || !isFinite(val))
        );
        
        if (hasInvalidCoordinates) {
            console.error('Found invalid coordinates in the extracted data');
            // Filter out invalid coordinates
            return coordinates.filter(coord => 
                coord && 
                coord.length === 3 && 
                coord.every(val => val !== undefined && val !== null && !isNaN(val) && isFinite(val))
            );
        }
        
        // Check for all zero coordinates (sometimes happens with badly formatted PDBs)
        const hasAllZeroCoordinates = coordinates.some(coord => 
            coord[0] === 0 && coord[1] === 0 && coord[2] === 0
        );
        
        if (hasAllZeroCoordinates) {
            console.warn('Found coordinates with all zeros - structure may be invalid');
        }
    }
    
    return coordinates;
} 