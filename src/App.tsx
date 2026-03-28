import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text as KonvaText, Transformer } from 'react-konva';
import { Sidebar } from './components/Sidebar';
import { CanvasElement } from './components/CanvasElement';
import { LayoutElement, ElementType, SCALE, VenueDimensions, WeddingLayout } from './types';
import { DEFAULT_ELEMENTS } from './constants';
import { motion } from 'motion/react';
import { Ruler } from 'lucide-react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';

export default function App() {
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 320, height: window.innerHeight });
  const [venueDimensions, setVenueDimensions] = useState<VenueDimensions>({ width: 20, height: 15 });
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState<number[]>([]);
  const [isDrawingRuler, setIsDrawingRuler] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<WeddingLayout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [guides, setGuides] = useState<number[][]>([]);
  const [clipboard, setClipboard] = useState<LayoutElement[]>([]);
  
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);

  useEffect(() => {
    if (transformerRef.current) {
      const nodes = selectedIds.map(id => stageRef.current.findOne(`#${id}`)).filter(Boolean);
      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, elements]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setSavedLayouts([]);
        setCurrentLayoutId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'layouts'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const layouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeddingLayout));
      setSavedLayouts(layouts);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
      }

      // Copy: Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      }

      // Paste: Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds]);

  const addElement = (type: ElementType) => {
    const defaults = DEFAULT_ELEMENTS[type];
    const newElement: LayoutElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 50 + (venueDimensions.width * SCALE) / 2,
      y: 50 + (venueDimensions.height * SCALE) / 2,
      rotation: 0,
      width: defaults.width || 1,
      height: defaults.height || 1,
      radius: defaults.radius,
      chairCount: defaults.chairCount,
      color: defaults.color,
      label: defaults.label,
    };
    setElements([...elements, newElement]);
    setSelectedIds([newElement.id]);
  };

  const addTemplate = (name: string) => {
    const newElements: LayoutElement[] = [];
    const startX = dimensions.width / 4;
    const startY = dimensions.height / 4;

    if (name === 'theater') {
      // 4 rows of 10 chairs
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
          newElements.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'chair',
            x: startX + col * 0.6 * SCALE,
            y: startY + row * 1.2 * SCALE,
            rotation: 0,
            width: 0.45,
            height: 0.45,
            color: '#e5e7eb',
          });
        }
      }
    } else if (name === 'banquet') {
      // 3x3 grid of round tables
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          newElements.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'round-table',
            x: startX + col * 4 * SCALE,
            y: startY + row * 4 * SCALE,
            rotation: 0,
            width: 1.8,
            height: 1.8,
            radius: 0.9,
            chairCount: 8,
            color: '#ffffff',
            label: `Table ${row * 3 + col + 1}`,
          });
        }
      }
    }

    setElements([...elements, ...newElements]);
  };

  const updateElement = (id: string, attrs: Partial<LayoutElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...attrs } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedIds(prev => prev.filter(sid => sid !== id));
  };

  const deleteSelected = () => {
    setElements(elements.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  // For the sidebar, we might still want to show properties if exactly one is selected
  const singleSelectedElement = selectedIds.length === 1 ? selectedElements[0] : null;

  const handleSelect = (id: string, isMulti: boolean) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;

    let idsToSelect = [id];
    if (el.groupId) {
      idsToSelect = elements.filter(e => e.groupId === el.groupId).map(e => e.id);
    }

    if (isMulti) {
      setSelectedIds(prev => {
        const alreadySelected = idsToSelect.every(sid => prev.includes(sid));
        if (alreadySelected) {
          return prev.filter(sid => !idsToSelect.includes(sid));
        } else {
          return [...new Set([...prev, ...idsToSelect])];
        }
      });
    } else {
      setSelectedIds(idsToSelect);
    }
  };

  const handleGroup = () => {
    if (selectedIds.length < 2) return;
    const groupId = Math.random().toString(36).substr(2, 9);
    setElements(prev => prev.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId } : el
    ));
  };

  const handleUngroup = () => {
    if (selectedIds.length === 0) return;
    setElements(prev => prev.map(el => 
      selectedIds.includes(el.id) ? { ...el, groupId: undefined } : el
    ));
  };

  const handleCopy = () => {
    if (selectedIds.length === 0) return;
    const selectedElements = elements.filter(el => selectedIds.includes(el.id));
    setClipboard(selectedElements);
  };

  const handlePaste = () => {
    if (clipboard.length === 0) return;

    // Map old group IDs to new group IDs to maintain grouping in pasted elements
    const groupMap: Record<string, string> = {};
    clipboard.forEach(el => {
      if (el.groupId && !groupMap[el.groupId]) {
        groupMap[el.groupId] = Math.random().toString(36).substr(2, 9);
      }
    });

    const offset = 20; // Offset pasted elements slightly
    const newElements = clipboard.map(el => ({
      ...el,
      id: Math.random().toString(36).substr(2, 9),
      x: el.x + offset,
      y: el.y + offset,
      groupId: el.groupId ? groupMap[el.groupId] : undefined,
    }));

    setElements(prev => [...prev, ...newElements]);
    setSelectedIds(newElements.map(el => el.id));
  };

  const handleUpdateMany = (ids: string[], attrs: Partial<LayoutElement>) => {
    setElements(prev => prev.map(el => ids.includes(el.id) ? { ...el, ...attrs } : el));
  };

  const handleUpdateElements = (updates: { id: string, attrs: Partial<LayoutElement> }[]) => {
    setElements(prev => prev.map(el => {
      const update = updates.find(u => u.id === el.id);
      return update ? { ...el, ...update.attrs } : el;
    }));
  };

  const handleMoveMany = (ids: string[], dx: number, dy: number) => {
    setElements(prev => prev.map(el => 
      ids.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el
    ));
  };

  const handleSave = async (name: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const layoutData = {
        userId: user.uid,
        name,
        elements,
        venueDimensions,
        updatedAt: serverTimestamp(),
      };

      if (currentLayoutId) {
        await updateDoc(doc(db, 'layouts', currentLayoutId), layoutData);
      } else {
        const docRef = await addDoc(collection(db, 'layouts'), {
          ...layoutData,
          createdAt: serverTimestamp(),
        });
        setCurrentLayoutId(docRef.id);
      }
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = (layout: WeddingLayout) => {
    setElements(layout.elements);
    setVenueDimensions(layout.venueDimensions);
    setCurrentLayoutId(layout.id || null);
    setSelectedIds([]);
  };

  const handleDeleteLayout = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'layouts', id));
      if (currentLayoutId === id) {
        setCurrentLayoutId(null);
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
    }
  };

  const handleExportPDF = () => {
    if (!stageRef.current) return;
    
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
    const pdf = new jsPDF({
      orientation: venueDimensions.width > venueDimensions.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [dimensions.width, dimensions.height]
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, dimensions.width, dimensions.height);
    pdf.save(`wedding-layout-${new Date().getTime()}.pdf`);
  };

  const handleMouseDown = (e: any) => {
    if (!isRulerActive) return;
    const pos = e.target.getStage().getPointerPosition();
    setRulerPoints([pos.x, pos.y, pos.x, pos.y]);
    setIsDrawingRuler(true);
  };

  const handleMouseMove = (e: any) => {
    if (!isRulerActive || !isDrawingRuler) return;
    const pos = e.target.getStage().getPointerPosition();
    setRulerPoints([rulerPoints[0], rulerPoints[1], pos.x, pos.y]);
  };

  const handleMouseUp = () => {
    if (!isRulerActive) return;
    setIsDrawingRuler(false);
  };

  const calculateDistance = () => {
    if (rulerPoints.length < 4) return 0;
    const dx = rulerPoints[2] - rulerPoints[0];
    const dy = rulerPoints[3] - rulerPoints[1];
    return Math.sqrt(dx * dx + dy * dy) / SCALE;
  };

  const handleCanvasDragMove = (id: string, x: number, y: number) => {
    const draggedEl = elements.find(el => el.id === id);
    if (!draggedEl) return;

    const SNAP_THRESHOLD = 5;
    const newGuides: number[][] = [];
    
    const draggedWidth = (draggedEl.width || 1) * SCALE;
    const draggedHeight = (draggedEl.height || 1) * SCALE;
    
    const draggedBounds = {
      vertical: [x - draggedWidth / 2, x, x + draggedWidth / 2],
      horizontal: [y - draggedHeight / 2, y, y + draggedHeight / 2],
    };

    let snappedX = x;
    let snappedY = y;

    elements.forEach(el => {
      if (el.id === id || selectedIds.includes(el.id)) return;

      const elWidth = (el.width || 1) * SCALE;
      const elHeight = (el.height || 1) * SCALE;
      
      const elBounds = {
        vertical: [el.x - elWidth / 2, el.x, el.x + elWidth / 2],
        horizontal: [el.y - elHeight / 2, el.y, el.y + elHeight / 2],
      };

      // Check vertical alignment (X axis)
      draggedBounds.vertical.forEach((dv, i) => {
        elBounds.vertical.forEach((ev) => {
          if (Math.abs(dv - ev) < SNAP_THRESHOLD) {
            const offset = ev - dv;
            snappedX = x + offset;
            newGuides.push([ev, 0, ev, dimensions.height]);
          }
        });
      });

      // Check horizontal alignment (Y axis)
      draggedBounds.horizontal.forEach((dh, i) => {
        elBounds.horizontal.forEach((eh) => {
          if (Math.abs(dh - eh) < SNAP_THRESHOLD) {
            const offset = eh - dh;
            snappedY = y + offset;
            newGuides.push([0, eh, dimensions.width, eh]);
          }
        });
      });
    });

    // Update the node position directly for visual snapping
    const node = stageRef.current.findOne(`#${id}`);
    if (node) {
      node.x(snappedX);
      node.y(snappedY);
    }

    setGuides(newGuides);
  };

  const handleCanvasDragEnd = (id: string, x: number, y: number) => {
    setGuides([]);
    // The actual state update is handled by CanvasElement's onDragEnd calling onChange
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa]">
      <Sidebar 
        onAddElement={addElement}
        onAddTemplate={addTemplate}
        selectedElement={singleSelectedElement}
        onDelete={deleteElement}
        onUpdate={updateElement}
        multiSelectedCount={selectedIds.length}
        onDeleteSelected={deleteSelected}
        isRulerActive={isRulerActive}
        onToggleRuler={() => {
          setIsRulerActive(!isRulerActive);
          setRulerPoints([]);
        }}
        venueDimensions={venueDimensions}
        onUpdateVenue={setVenueDimensions}
        user={user}
        onLogin={signInWithGoogle}
        onLogout={logout}
        savedLayouts={savedLayouts}
        onSave={handleSave}
        onLoad={handleLoad}
        onDeleteLayout={handleDeleteLayout}
        isSaving={isSaving}
        onExportPDF={handleExportPDF}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onCopy={handleCopy}
        onPaste={handlePaste}
        hasClipboard={clipboard.length > 0}
        hasGroupedSelection={selectedElements.some(el => !!el.groupId)}
      />
      
      <main className="flex-1 relative overflow-hidden canvas-container">
        <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
           <div className="flex gap-2">
             <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-gray-100 shadow-sm flex items-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mr-3">Scale</span>
                <span className="text-xs font-bold">1m = {SCALE}px</span>
             </div>
             <button 
               onClick={() => {
                 setIsRulerActive(!isRulerActive);
                 setRulerPoints([]);
               }}
               className={`px-4 py-2 rounded-full border shadow-sm flex items-center transition-all ${isRulerActive ? 'bg-[#d4af37] text-white border-[#d4af37]' : 'bg-white/80 backdrop-blur text-gray-600 border-gray-100 hover:bg-gray-50'}`}
             >
                <Ruler className="w-4 h-4 mr-2" />
                <span className="text-xs font-bold">{isRulerActive ? 'Ruler Active' : 'Ruler Tool'}</span>
             </button>
           </div>
           {selectedIds.length > 1 && (
             <div className="bg-[#d4af37] text-white px-4 py-2 rounded-full shadow-sm flex items-center animate-in fade-in slide-in-from-left-4">
                <span className="text-[10px] font-mono uppercase tracking-widest mr-3">Selection</span>
                <span className="text-xs font-bold">{selectedIds.length} Elements Selected</span>
             </div>
           )}
        </div>

        <Stage
          width={dimensions.width}
          height={dimensions.height}
          ref={stageRef}
          onClick={(e) => {
            if (isRulerActive) return;
            // Deselect if clicking the stage itself or the venue background
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'venue-area';
            if (clickedOnEmpty) {
              setSelectedIds([]);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {/* Venue Area */}
            <Rect
              name="venue-area"
              x={50}
              y={50}
              width={venueDimensions.width * SCALE}
              height={venueDimensions.height * SCALE}
              fill="#ffffff"
              stroke="#e5e7eb"
              strokeWidth={2}
              dash={[10, 5]}
              shadowBlur={5}
              shadowColor="#00000010"
            />
            <KonvaText
              name="venue-area"
              x={60}
              y={venueDimensions.height * SCALE + 60}
              text={`${venueDimensions.width}m x ${venueDimensions.height}m Venue Area`}
              fontSize={12}
              fontFamily="JetBrains Mono"
              fill="#9ca3af"
              fontStyle="bold"
            />

            {elements.map((el) => (
              <CanvasElement
                key={el.id}
                element={el}
                isSelected={selectedIds.includes(el.id)}
                onSelect={(isMulti) => !isRulerActive && handleSelect(el.id, isMulti)}
                onChange={(attrs) => updateElement(el.id, attrs)}
                onUpdateMany={(attrs) => handleUpdateMany(selectedIds, attrs)}
                onMoveMany={(dx, dy) => handleMoveMany(selectedIds, dx, dy)}
                onDragMove={handleCanvasDragMove}
                onDragEnd={handleCanvasDragEnd}
                selectedIds={selectedIds}
                draggable={!isRulerActive}
              />
            ))}

            <Transformer
              ref={transformerRef}
              rotateEnabled={true}
              resizeEnabled={false}
              padding={5}
              anchorSize={8}
              anchorCornerRadius={4}
              anchorStroke="#d4af37"
              anchorFill="#ffffff"
              borderStroke="#d4af37"
              borderDash={[3, 3]}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
              onTransform={(e) => {
                const node = e.target;
                const rotation = node.rotation();
                const normalizedRotation = ((rotation % 360) + 360) % 360;
                
                const snapAngles = [0, 90, 180, 270, 360];
                const isSnapped = snapAngles.some(angle => Math.abs(normalizedRotation - angle) < 1);

                if (isSnapped) {
                  const x = node.x();
                  const y = node.y();
                  setGuides([
                    [x, 0, x, dimensions.height],
                    [0, y, dimensions.width, y]
                  ]);
                } else {
                  setGuides([]);
                }
              }}
              onTransformEnd={(e) => {
                setGuides([]);
                if (selectedIds.length === 1) {
                  const node = stageRef.current.findOne(`#${selectedIds[0]}`);
                  if (node) {
                    updateElement(selectedIds[0], {
                      rotation: node.rotation(),
                    });
                  }
                } else {
                  const updates = selectedIds.map(id => {
                    const n = stageRef.current.findOne(`#${id}`);
                    return n ? { id, attrs: { x: n.x(), y: n.y(), rotation: n.rotation() } } : null;
                  }).filter(Boolean) as { id: string, attrs: Partial<LayoutElement> }[];
                  
                  handleUpdateElements(updates);
                }
              }}
            />
          </Layer>
          
          {/* Guides Layer */}
          <Layer>
            {guides.map((points, i) => (
              <Line
                key={`guide-${i}`}
                points={points}
                stroke="#d4af37"
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.6}
              />
            ))}
          </Layer>

          {isRulerActive && rulerPoints.length === 4 && (
            <Layer>
              <Line
                points={rulerPoints}
                stroke="#d4af37"
                strokeWidth={2}
                dash={[5, 5]}
              />
              <Circle x={rulerPoints[0]} y={rulerPoints[1]} radius={4} fill="#d4af37" />
              <Circle x={rulerPoints[2]} y={rulerPoints[3]} radius={4} fill="#d4af37" />
              <KonvaText
                x={(rulerPoints[0] + rulerPoints[2]) / 2 + 10}
                y={(rulerPoints[1] + rulerPoints[3]) / 2 - 20}
                text={`${calculateDistance().toFixed(2)}m`}
                fontSize={14}
                fontStyle="bold"
                fill="#d4af37"
                background="white"
              />
            </Layer>
          )}
        </Stage>

        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h3 className="text-2xl font-serif italic text-gray-300 mb-2">Empty Canvas</h3>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Select an element to begin planning</p>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}

