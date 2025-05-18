import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, GripVertical, Info, Settings, Dna, Zap, Beaker, Minimize, Maximize } from "lucide-react";
import { toast } from "sonner";
import { FASTASequenceViewer } from './FASTASequenceViewer';

// Entity types with icons
const ENTITY_TYPES = [
  { value: "protein", label: "Protein", icon: <Settings className="w-4 h-4 mr-2" /> },
  { value: "dna", label: "DNA", icon: <Dna className="w-4 h-4 mr-2" /> },
  { value: "rna", label: "RNA", icon: <Dna className="w-4 h-4 mr-2" /> },
  { value: "ion", label: "Ion", icon: <Zap className="w-4 h-4 mr-2" /> },
  { value: "ligand", label: "Ligand", icon: <Beaker className="w-4 h-4 mr-2" /> }
];

// Ion options
const ION_OPTIONS = [
  { value: "Mg2+", label: "Mg²⁺" },
  { value: "Zn2+", label: "Zn²⁺" },
  { value: "Cl-", label: "Cl⁻" },
  { value: "Ca2+", label: "Ca²⁺" },
  { value: "Na+", label: "Na⁺" },
  { value: "Mn2+", label: "Mn²⁺" },
];

// Default entity
const DEFAULT_ENTITY = {
  id: Date.now(),
  type: "protein",
  copies: 1,
  sequence: "",
  fastaHeader: "",
  displayed: true
};

// Helper function to extract FASTA header if present
const extractFastaHeader = (sequence) => {
  if (sequence && sequence.startsWith(">")) {
    const lines = sequence.split("\n");
    return lines[0].substring(1); // Remove the '>' character
  }
  return "";
};

export default function EntityInput({ onEntitiesChange, onSubmit }) {
  const [entities, setEntities] = useState([{ ...DEFAULT_ENTITY }]);
  const [collapsedEntities, setCollapsedEntities] = useState({});
  const [originalSequences, setOriginalSequences] = useState({});
  const [editingEntities, setEditingEntities] = useState({});
  const [highlightedEntity, setHighlightedEntity] = useState(null);
  const containerRef = useRef(null);

  // Handle scrolling behavior based on number of entities
  useEffect(() => {
    if (containerRef.current) {
      if (entities.length > 1) {
        containerRef.current.style.overflowY = "auto";
        containerRef.current.style.maxHeight = "400px";
      } else {
        containerRef.current.style.overflowY = "visible";
        containerRef.current.style.maxHeight = "none";
        containerRef.current.style.overflow = "visible";
      }
    }
  }, [entities.length]);

  // Add a CSS style using useEffect to ensure proper animation
  useEffect(() => {
    // Add a style tag to the document for smoother animations
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
      .entity-body {
        transition: max-height 350ms cubic-bezier(0.4, 0, 0.2, 1),
                    opacity 250ms cubic-bezier(0.4, 0, 0.2, 1),
                    padding 250ms cubic-bezier(0.4, 0, 0.2, 1);
        will-change: max-height, opacity, padding;
        overflow: hidden;
      }
      .entity-body.collapsed {
        max-height: 0 !important;
        opacity: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin: 0;
      }
      .entity-body.expanded {
        max-height: 2000px;
        opacity: 1;
      }
      .entity-highlight {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1);
      }
      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 0 0 0 rgba(var(--color-primary), 0.7);
        }
        50% {
          box-shadow: 0 0 0 4px rgba(var(--color-primary), 0.3);
        }
      }
    `;
    document.head.appendChild(styleTag);
    
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const addEntity = () => {
    if (entities.length >= 20) {
      toast.error("Maximum of 20 entities allowed");
      return;
    }
    
    // Create new entity first
    const newEntity = { ...DEFAULT_ENTITY, id: Date.now() };
    
    // Update collapsed state in a single operation
    const newCollapsedState = {};
    entities.forEach(entity => {
      newCollapsedState[entity.id] = true;
    });
    // Make sure the new entity is not collapsed
    newCollapsedState[newEntity.id] = false;
    
    // Update entities and collapsed state
    const updatedEntities = [...entities, newEntity];
    
    // Batch state updates to reduce UI flickering
    setEntities(updatedEntities);
    setCollapsedEntities(newCollapsedState);
    
    // Notify parent component
    onEntitiesChange(updatedEntities);
    
    // Highlight after state updates are applied
    requestAnimationFrame(() => {
      setHighlightedEntity(newEntity.id);
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightedEntity(null);
      }, 2000);
      
      // Scroll to the newly added entity
      requestAnimationFrame(() => {
        if (containerRef.current) {
          const entityElements = containerRef.current.querySelectorAll('.bg-card');
          const lastEntity = entityElements[entityElements.length - 1];
          if (lastEntity) {
            lastEntity.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });
  };

  const removeEntity = (id) => {
    if (entities.length <= 1) {
      toast.error("At least one entity is required");
      return;
    }
    const updatedEntities = entities.filter(entity => entity.id !== id);
    setEntities(updatedEntities);
    
    // Notify parent component
    onEntitiesChange(updatedEntities);
    
    // Also remove from collapsed state if it exists
    if (collapsedEntities[id]) {
      const newCollapsedState = { ...collapsedEntities };
      delete newCollapsedState[id];
      setCollapsedEntities(newCollapsedState);
    }
  };

  const updateEntity = (id, field, value) => {
    const updatedEntities = entities.map(entity => {
      if (entity.id === id) {
        // If updating sequence, handle FASTA format and store the original
        if (field === "sequence") {
          // Store the original sequence for future editing
          if (value && value.trim() !== "") {
            setOriginalSequences(prev => ({
              ...prev,
              [id]: value
            }));
            
            // Extract FASTA header if present
            const fastaHeader = extractFastaHeader(value);
            return { 
              ...entity, 
              [field]: value,
              fastaHeader: fastaHeader
            };
          } else {
            // If clearing the sequence, also clear the header
            return { 
              ...entity, 
              [field]: value,
              fastaHeader: ""
            };
          }
        }
        
        return { ...entity, [field]: value };
      }
      return entity;
    });
    setEntities(updatedEntities);
    
    // Notify parent component
    onEntitiesChange(updatedEntities);
  };

  // Function to get entity type icon
  const getEntityIcon = (type) => {
    const entityType = ENTITY_TYPES.find(t => t.value === type);
    return entityType ? entityType.icon : null;
  };

  // Function to toggle collapse state for an entity
  const toggleCollapse = (id) => {
    // Use requestAnimationFrame for smoother animations
    requestAnimationFrame(() => {
      setCollapsedEntities(prev => ({
        ...prev,
        [id]: !prev[id]
      }));
    });
  };

  // Function to toggle edit mode for an entity
  const toggleEditMode = (id, isEditing) => {
    setEditingEntities(prev => ({
      ...prev,
      [id]: isEditing
    }));
    
    // If going into edit mode, restore the original sequence if available
    if (isEditing && originalSequences[id]) {
      updateEntity(id, "sequence", originalSequences[id]);
    }
    
    // If exiting edit mode and no sequence is present, ensure we don't show an empty viewer
    if (!isEditing) {
      const entity = entities.find(e => e.id === id);
      if (entity && !entity.sequence.trim()) {
        toggleEditMode(id, true); // Keep in edit mode if sequence is empty
      }
    }
  };

  const renderEntityInput = (entity) => {
    const { id, type, copies, sequence, fastaHeader } = entity;
    const entityTypeLabel = ENTITY_TYPES.find(t => t.value === type)?.label || type;
    const isCollapsed = collapsedEntities[id];
    const isHighlighted = highlightedEntity === id;

    return (
      <div 
        key={id} 
        className={`bg-card rounded-lg border shadow-sm mb-4 overflow-hidden ${
          isHighlighted ? 'ring-2 ring-primary entity-highlight' : ''
        }`}
      >
        {/* Entity Header */}
        <div className="flex items-center justify-between bg-muted/20 p-3 border-b">
          <div className="flex items-center flex-wrap gap-2">
            {getEntityIcon(type)}
            <span className="font-medium">{entityTypeLabel}</span>
            {copies > 1 && (
              <Badge variant="outline" className="ml-2">
                {copies}x
              </Badge>
            )}
            {fastaHeader && (
              <Badge 
                variant="secondary" 
                className="max-w-[300px] truncate text-xs font-normal flex-shrink"
                title={fastaHeader} // Show full header on hover
              >
                {fastaHeader}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground transition-all duration-150"
              onClick={() => toggleCollapse(id)}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors duration-150"
              onClick={() => removeEntity(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Entity Body - with CSS classes for transitions */}
        <div className={`entity-body ${isCollapsed ? 'collapsed' : 'expanded p-4'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor={`entity-type-${id}`} className="text-xs text-muted-foreground">
                ENTITY TYPE
              </Label>
              <Select
                value={type}
                onValueChange={(value) => updateEntity(id, "type", value)}
              >
                <SelectTrigger id={`entity-type-${id}`} className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor={`entity-copies-${id}`} className="text-xs text-muted-foreground">
                COPIES
              </Label>
              <Select
                value={String(copies)}
                onValueChange={(value) => updateEntity(id, "copies", parseInt(value))}
              >
                <SelectTrigger id={`entity-copies-${id}`} className="mt-1">
                  <SelectValue placeholder="Copies" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Sequence input for Protein, DNA, and RNA */}
          {(type === "protein" || type === "dna" || type === "rna") && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor={`entity-sequence-${id}`} className="text-xs text-muted-foreground">
                  SEQUENCE
                </Label>
                <Badge variant="outline" className="text-xs px-2 py-0">
                  {type === "protein" 
                    ? "FASTA Format" 
                    : type === "dna" 
                    ? "5'→3' single strand"
                    : "5'→3' single strand"}
                </Badge>
              </div>
              
              {sequence && !editingEntities[id] ? (
                <div className="relative mt-1">
                  <FASTASequenceViewer 
                    sequence={sequence} 
                    type={type}
                    simplified={true}
                    onEdit={() => toggleEditMode(id, true)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 h-6 opacity-90"
                    onClick={() => toggleEditMode(id, true)}
                  >
                    Edit
                  </Button>
                </div>
              ) : (
                <div>
                  <Textarea
                    id={`entity-sequence-${id}`}
                    value={sequence}
                    onChange={(e) => updateEntity(id, "sequence", e.target.value)}
                    placeholder={
                      type === "protein"
                        ? "Enter protein sequence in FASTA format (include a header line starting with >)"
                        : type === "dna"
                        ? "Enter DNA sequence (A, T, G, C)"
                        : "Enter RNA sequence (A, U, G, C)"
                    }
                    className="h-24 font-mono mt-1"
                  />
                  {sequence && (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleEditMode(id, false)}
                      >
                        Done
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Ion selector */}
          {type === "ion" && (
            <div className="mt-4">
              <Label htmlFor={`entity-ion-${id}`} className="text-xs text-muted-foreground">
                ION
              </Label>
              <Select
                value={sequence}
                onValueChange={(value) => updateEntity(id, "sequence", value)}
              >
                <SelectTrigger id={`entity-ion-${id}`} className="mt-1">
                  <SelectValue placeholder="Select ion" />
                </SelectTrigger>
                <SelectContent>
                  {ION_OPTIONS.map((ion) => (
                    <SelectItem key={ion.value} value={ion.value}>
                      {ion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Ligand input */}
          {type === "ligand" && (
            <div className="mt-4">
              <Label htmlFor={`entity-ligand-${id}`} className="text-xs text-muted-foreground">
                LIGAND STRUCTURE
              </Label>
              <Textarea
                id={`entity-ligand-${id}`}
                value={sequence}
                onChange={(e) => updateEntity(id, "sequence", e.target.value)}
                placeholder="Enter SMILES or PDB code"
                className="h-24 font-mono mt-1"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div 
        className="space-y-4" 
        ref={containerRef}
        style={{ 
          overflowY: "visible", 
          maxHeight: "none", 
          overflow: "visible"
        }}
      >
        {entities.map(renderEntityInput)}
      </div>
      
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-1 border-dashed"
          onClick={addEntity}
        >
          <Plus className="h-4 w-4" /> Add entity
        </Button>

        <Button
          type="submit"
          className="w-full"
          onClick={onSubmit}
        >
          Submit Job
        </Button>
        
        <p className="text-xs text-muted-foreground flex items-center justify-center">
          <Info className="inline-block w-4 h-4 mr-1" />
          Add up to 20 entities for complex structure prediction
        </p>
      </div>
    </div>
  );
} 