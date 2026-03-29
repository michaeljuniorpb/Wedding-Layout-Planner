import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text as KonvaText, Transformer, Group } from 'react-konva';
import { Guides, GuidesHandle } from './components/Guides';
import { Sidebar } from './components/Sidebar';
import { CanvasElement } from './components/CanvasElement';
import { LayoutElement, ElementType, SCALE, VenueDimensions, WeddingLayout, PersistentRuler } from './types';
import { DEFAULT_ELEMENTS } from './constants';
import { motion } from 'motion/react';
import { Ruler } from 'lucide-react';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [elements, setElements] = useState<LayoutElement[]>([]);
  const [history, setHistory] = useState<LayoutElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isInternalUpdate = useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth - 320, height: window.innerHeight });
  const [venueDimensions, setVenueDimensions] = useState<VenueDimensions>({ width: 20, height: 15 });
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [rulerPoints, setRulerPoints] = useState<number[]>([]);
  const [isDrawingRuler, setIsDrawingRuler] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<WeddingLayout[]>([]);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [clipboard, setClipboard] = useState<LayoutElement[]>([]);
  const [selectionRect, setSelectionRect] = useState({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
  const [persistentRulers, setPersistentRulers] = useState<PersistentRuler[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPos, setEditingPos] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const guidesRef = useRef<GuidesHandle>(null);
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const selectionDragRef = useRef(false);
  const dragStartPositions = useRef<Record<string, { x: number, y: number }>>({});

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
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentElementsJson = JSON.stringify(elements);
      const lastHistoryJson = JSON.stringify(history[historyIndex]);

      if (currentElementsJson !== lastHistoryJson) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(currentElementsJson));
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [elements]);

  const undo = () => {
    if (historyIndex > 0) {
      isInternalUpdate.current = true;
      const prevIndex = historyIndex - 1;
      setElements(JSON.parse(JSON.stringify(history[prevIndex])));
      setHistoryIndex(prevIndex);
      setSelectedIds([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isInternalUpdate.current = true;
      const nextIndex = historyIndex + 1;
      setElements(JSON.parse(JSON.stringify(history[nextIndex])));
      setHistoryIndex(nextIndex);
      setSelectedIds([]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }

      // Copy: Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
      }

      // Paste: Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePaste();
      }

      // Bold: Ctrl+B or Cmd+B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const el = elements.find(el => selectedIds.includes(el.id) && (el.type === 'text-box' || el.label));
        if (el) {
          updateElement(el.id, { isBold: el.isBold === false ? true : false });
        }
      }

      // Italic: Ctrl+I or Cmd+I
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        const el = elements.find(el => selectedIds.includes(el.id) && (el.type === 'text-box' || el.label));
        if (el) {
          updateElement(el.id, { isItalic: !el.isItalic });
        }
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
      text: defaults.text,
      fontSize: defaults.fontSize,
      fontFamily: defaults.fontFamily,
      textAlign: defaults.textAlign || 'center',
      isBold: defaults.isBold || false,
      isItalic: defaults.isItalic || false,
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

  const bringToFront = () => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const unselected = elements.filter(el => !selectedIds.includes(el.id));
    setElements([...unselected, ...selected]);
  };

  const sendToBack = () => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    const unselected = elements.filter(el => !selectedIds.includes(el.id));
    setElements([...selected, ...unselected]);
  };

  const bringForward = () => {
    if (selectedIds.length === 0) return;
    const newElements = [...elements];
    for (let i = newElements.length - 2; i >= 0; i--) {
      if (selectedIds.includes(newElements[i].id) && !selectedIds.includes(newElements[i+1].id)) {
        const temp = newElements[i];
        newElements[i] = newElements[i+1];
        newElements[i+1] = temp;
      }
    }
    setElements(newElements);
  };

  const sendBackward = () => {
    if (selectedIds.length === 0) return;
    const newElements = [...elements];
    for (let i = 1; i < newElements.length; i++) {
      if (selectedIds.includes(newElements[i].id) && !selectedIds.includes(newElements[i-1].id)) {
        const temp = newElements[i];
        newElements[i] = newElements[i-1];
        newElements[i-1] = temp;
      }
    }
    setElements(newElements);
  };

  const ungroupChairs = (tableId: string) => {
    const table = elements.find(el => el.id === tableId);
    if (!table || !table.chairCount || table.chairCount === 0) return;

    const newChairs: LayoutElement[] = [];
    const chairSize = 0.4; // meters
    const chairSizePx = chairSize * SCALE;
    const count = table.chairCount;
    const rotationRad = (table.rotation * Math.PI) / 180;

    if (table.type === 'round-table' || table.type === 'cake-table') {
      const radius = (table.radius || 0.9) * SCALE;
      const distance = radius + 15;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const offsetX = Math.cos(angle) * distance;
        const offsetY = Math.sin(angle) * distance;
        
        const rx = offsetX * Math.cos(rotationRad) - offsetY * Math.sin(rotationRad);
        const ry = offsetX * Math.sin(rotationRad) + offsetY * Math.cos(rotationRad);

        newChairs.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'chair',
          x: table.x + rx,
          y: table.y + ry,
          rotation: table.rotation + (angle * 180) / Math.PI + 90,
          width: chairSize,
          height: chairSize,
          color: '#e5e7eb',
          label: table.chairLabels?.[i],
        });
      }
    } else if (table.type === 'long-table' || table.type === 'vip-table' || table.type === 'akad-table') {
      const w = table.width * SCALE;
      const h = table.height * SCALE;
      
      for (let i = 0; i < count; i++) {
        let cx = 0;
        let cy = 0;
        
        if (table.type === 'akad-table') {
          if (i < 2) { // Top
            cx = (i === 0 ? -w/4 : w/4) - chairSizePx / 2;
            cy = -h/2 - chairSizePx - 5;
          } else if (i < 4) { // Bottom
            cx = (i === 2 ? -w/4 : w/4) - chairSizePx / 2;
            cy = h/2 + 5;
          } else if (i === 4) { // Left
            cx = -w/2 - chairSizePx - 5;
            cy = -chairSizePx / 2;
          } else if (i === 5) { // Right
            cx = w/2 + 5;
            cy = -chairSizePx / 2;
          }
        } else {
          const isVip = table.type === 'vip-table';
          const chairsPerSide = isVip ? count : Math.ceil(count / 2);
          const side = isVip ? 1 : (i < chairsPerSide ? 0 : 1);
          const index = isVip ? i : (i % chairsPerSide);
          const spacing = w / (chairsPerSide + 1);
          
          cx = spacing * (index + 1) - chairSizePx / 2 - w/2;
          cy = side === 0 ? -h/2 - chairSizePx - 5 : h/2 + 5;
        }

        const rx = (cx + chairSizePx/2) * Math.cos(rotationRad) - (cy + chairSizePx/2) * Math.sin(rotationRad);
        const ry = (cx + chairSizePx/2) * Math.sin(rotationRad) + (cy + chairSizePx/2) * Math.cos(rotationRad);

        newChairs.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'chair',
          x: table.x + rx,
          y: table.y + ry,
          rotation: table.rotation,
          width: chairSize,
          height: chairSize,
          color: '#e5e7eb',
          label: table.chairLabels?.[i],
        });
      }
    }

    setElements(prev => {
      const updated = prev.map(el => el.id === tableId ? { ...el, chairCount: 0, chairLabels: [] } : el);
      return [...updated, ...newChairs];
    });
    setSelectedIds([tableId, ...newChairs.map(c => c.id)]);
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

  const handleDeleteRuler = (id: string) => {
    setPersistentRulers(prev => prev.filter(r => r.id !== id));
  };

  const handleSave = async (name: string) => {
    if (!user) {
      toast.error('Please login to save your layout');
      return;
    }
    setIsSaving(true);
    const toastId = toast.loading('Saving layout...');
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
        toast.success('Layout updated successfully', { id: toastId });
      } else {
        const docRef = await addDoc(collection(db, 'layouts'), {
          ...layoutData,
          createdAt: serverTimestamp(),
        });
        setCurrentLayoutId(docRef.id);
        toast.success('Layout saved successfully', { id: toastId });
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout. Please try again.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewLayout = () => {
    if (elements.length > 0) {
      if (window.confirm('Are you sure you want to start a new layout? All unsaved changes will be lost.')) {
        setElements([]);
        setCurrentLayoutId(null);
        setHistory([[]]);
        setHistoryIndex(0);
        setSelectedIds([]);
        toast.success('Started a new layout');
      }
    } else {
      setCurrentLayoutId(null);
      toast.success('Started a new layout');
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
    const pos = e.target.getStage().getPointerPosition();
    if (isRulerActive) {
      setRulerPoints([pos.x, pos.y, pos.x, pos.y]);
      setIsDrawingRuler(true);
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'venue-area';
    if (clickedOnEmpty) {
      setSelectionRect({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, visible: true });
    }
  };

  const handleMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    if (isRulerActive && isDrawingRuler) {
      setRulerPoints([rulerPoints[0], rulerPoints[1], pos.x, pos.y]);
      return;
    }

    if (selectionRect.visible) {
      setSelectionRect(prev => ({ ...prev, x2: pos.x, y2: pos.y }));
    }
  };

  const handleMouseUp = () => {
    if (isRulerActive) {
      const newRuler: PersistentRuler = {
        id: Math.random().toString(36).substr(2, 9),
        p1: { x: rulerPoints[0], y: rulerPoints[1] },
        p2: { x: rulerPoints[2], y: rulerPoints[3] }
      };
      setPersistentRulers([...persistentRulers, newRuler]);
      setIsDrawingRuler(false);
      setIsRulerActive(false); // Deactivate tool after placing
      return;
    }

    if (selectionRect.visible) {
      const { x1, y1, x2, y2 } = selectionRect;
      const box = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x1 - x2),
        height: Math.abs(y1 - y2)
      };

      if (box.width > 5 || box.height > 5) {
        selectionDragRef.current = true;
        const selected = elements.filter(el => {
          return (
            el.x >= box.x &&
            el.x <= box.x + box.width &&
            el.y >= box.y &&
            el.y <= box.y + box.height
          );
        });
        
        if (selected.length > 0) {
          setSelectedIds(selected.map(el => el.id));
        } else {
          setSelectedIds([]);
        }
      } else {
        selectionDragRef.current = false;
      }

      setSelectionRect({ x1: 0, y1: 0, x2: 0, y2: 0, visible: false });
    }
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = (x2 - x1) / SCALE;
    const dy = (y2 - y1) / SCALE;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleCanvasDragMove = (id: string, x: number, y: number) => {
    const isMultiDrag = selectedIds.length > 1 && selectedIds.includes(id);
    
    if (isMultiDrag) {
      // For multi-drag, we calculate delta from the initial positions stored in dragStartPositions
      const startPos = dragStartPositions.current[id];
      if (startPos) {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        
        // Update all other selected nodes visually
        selectedIds.forEach(sid => {
          if (sid === id) return;
          const node = stageRef.current.findOne(`#${sid}`);
          const sPos = dragStartPositions.current[sid];
          if (node && sPos) {
            node.x(sPos.x + dx);
            node.y(sPos.y + dy);
          }
        });
      }
      guidesRef.current?.setGuides([]);
      return;
    }

    if (!isSnappingEnabled) {
      guidesRef.current?.setGuides([]);
      return;
    }

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

    guidesRef.current?.setGuides(newGuides);
  };

  const handleCanvasDragEnd = (id: string, x: number, y: number) => {
    guidesRef.current?.setGuides([]);
    
    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const startPos = dragStartPositions.current[id];
      if (startPos) {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        handleMoveMany(selectedIds, dx, dy);
      }
    } else {
      updateElement(id, { x, y });
    }
    
    dragStartPositions.current = {};
  };

  const handleDragStart = (id: string) => {
    // Store initial positions of all selected elements
    const positions: Record<string, { x: number, y: number }> = {};
    selectedIds.forEach(sid => {
      const el = elements.find(e => e.id === sid);
      if (el) {
        positions[sid] = { x: el.x, y: el.y };
      }
    });
    dragStartPositions.current = positions;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fa]">
      <Toaster position="top-right" richColors />
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
        onNewLayout={handleNewLayout}
        onLoad={handleLoad}
        onDeleteLayout={handleDeleteLayout}
        isSaving={isSaving}
        onExportPDF={handleExportPDF}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onBringToFront={bringToFront}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onSendToBack={sendToBack}
        onUngroupChairs={ungroupChairs}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isSnappingEnabled={isSnappingEnabled}
        onToggleSnapping={() => setIsSnappingEnabled(!isSnappingEnabled)}
        hasClipboard={clipboard.length > 0}
        hasGroupedSelection={selectedElements.some(el => !!el.groupId)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onClearRulers={() => setPersistentRulers([])}
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
            if (isRulerActive || selectionDragRef.current) {
              selectionDragRef.current = false;
              return;
            }
            // Deselect if clicking the stage itself or the venue background
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'venue-area';
            if (clickedOnEmpty) {
              setSelectedIds([]);
            }
          }}
          onTap={(e) => {
            if (isRulerActive || selectionDragRef.current) {
              selectionDragRef.current = false;
              return;
            }
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'venue-area';
            if (clickedOnEmpty) {
              setSelectedIds([]);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
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
            {showGrid && (
              <Group name="grid">
                {Array.from({ length: Math.ceil(venueDimensions.width) + 1 }).map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[50 + i * SCALE, 50, 50 + i * SCALE, 50 + venueDimensions.height * SCALE]}
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: Math.ceil(venueDimensions.height) + 1 }).map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[50, 50 + i * SCALE, 50 + venueDimensions.width * SCALE, 50 + i * SCALE]}
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                ))}
              </Group>
            )}
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
                onMoveMany={(dx, dy) => {}} // Handled by App.tsx now
                onDragStart={handleDragStart}
                onDragMove={handleCanvasDragMove}
                onDragEnd={handleCanvasDragEnd}
                onDblClick={(id, x, y, width, height, text) => {
                  setEditingId(id);
                  setEditingText(text);
                  setEditingPos({ x, y, width, height });
                }}
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
                  guidesRef.current?.setGuides([
                    [x, 0, x, dimensions.height],
                    [0, y, dimensions.width, y]
                  ]);
                } else {
                  guidesRef.current?.setGuides([]);
                }
              }}
              onTransformEnd={(e) => {
                guidesRef.current?.setGuides([]);
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
          
          <Guides ref={guidesRef} />

          {/* Selection Rect Layer */}
          <Layer>
            {selectionRect.visible && (
              <Rect
                x={Math.min(selectionRect.x1, selectionRect.x2)}
                y={Math.min(selectionRect.y1, selectionRect.y2)}
                width={Math.abs(selectionRect.x1 - selectionRect.x2)}
                height={Math.abs(selectionRect.y1 - selectionRect.y2)}
                fill="rgba(212, 175, 55, 0.1)"
                stroke="#d4af37"
                strokeWidth={1}
                dash={[4, 2]}
              />
            )}
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
                text={`${calculateDistance(rulerPoints[0], rulerPoints[1], rulerPoints[2], rulerPoints[3]).toFixed(2)}m`}
                fontSize={14}
                fontStyle="bold"
                fill="#d4af37"
              />
            </Layer>
          )}

          {persistentRulers.map(ruler => (
            <Layer key={ruler.id}>
              <Group
                draggable
                onDragEnd={(e) => {
                  const dx = e.target.x();
                  const dy = e.target.y();
                  setPersistentRulers(prev => prev.map(r => 
                    r.id === ruler.id ? {
                      ...r,
                      p1: { x: r.p1.x + dx, y: r.p1.y + dy },
                      p2: { x: r.p2.x + dx, y: r.p2.y + dy }
                    } : r
                  ));
                  e.target.position({ x: 0, y: 0 });
                }}
              >
                <Line
                  points={[ruler.p1.x, ruler.p1.y, ruler.p2.x, ruler.p2.y]}
                  stroke="#d4af37"
                  strokeWidth={4} // Thicker for easier grabbing
                  hitStrokeWidth={20} // Even thicker hit area
                  dash={[5, 5]}
                  opacity={0.8}
                />
                <Circle x={ruler.p1.x} y={ruler.p1.y} radius={6} fill="#d4af37" opacity={0.8} />
                <Circle x={ruler.p2.x} y={ruler.p2.y} radius={6} fill="#d4af37" opacity={0.8} />
                
                {/* Measurement Text */}
                <Group
                  x={(ruler.p1.x + ruler.p2.x) / 2}
                  y={(ruler.p1.y + ruler.p2.y) / 2}
                >
                  <Rect
                    x={5}
                    y={-25}
                    width={70}
                    height={20}
                    fill="white"
                    stroke="#d4af37"
                    strokeWidth={1}
                    cornerRadius={4}
                    opacity={0.9}
                  />
                  <KonvaText
                    x={10}
                    y={-22}
                    text={`${calculateDistance(ruler.p1.x, ruler.p1.y, ruler.p2.x, ruler.p2.y).toFixed(2)}m`}
                    fontSize={12}
                    fontStyle="bold"
                    fill="#d4af37"
                  />
                  
                  {/* Delete Button (X) */}
                  <Group
                    x={65}
                    y={-25}
                    onClick={() => handleDeleteRuler(ruler.id)}
                    onTap={() => handleDeleteRuler(ruler.id)}
                    className="cursor-pointer"
                  >
                    <Circle
                      radius={8}
                      fill="#ef4444"
                      stroke="white"
                      strokeWidth={1}
                    />
                    <KonvaText
                      text="×"
                      fontSize={14}
                      fill="white"
                      x={-4}
                      y={-7}
                    />
                  </Group>
                </Group>
              </Group>
            </Layer>
          ))}
        </Stage>

        {editingId && (
          <textarea
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              const el = elements.find(e => e.id === editingId);
              if (el) {
                if (el.type === 'text-box') {
                  updateElement(editingId, { text: editingText });
                } else {
                  updateElement(editingId, { label: editingText });
                }
              }
              setEditingId(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.currentTarget.blur();
              }
              if (e.key === 'Escape') {
                setEditingId(null);
              }
            }}
            style={{
              position: 'absolute',
              top: editingPos.y,
              left: editingPos.x,
              width: editingPos.width,
              height: editingPos.height,
              fontSize: (() => {
                const el = elements.find(e => e.id === editingId);
                if (!el) return 16;
                return el.fontSize || (el.type === 'text-box' ? 16 : (el.type === 'chair' ? 8 : 10));
              })(),
              fontFamily: 'Inter',
              fontWeight: elements.find(e => e.id === editingId)?.isBold !== false ? 'bold' : 'normal',
              fontStyle: elements.find(e => e.id === editingId)?.isItalic ? 'italic' : 'normal',
              border: '1px solid #d4af37',
              padding: '5px',
              boxSizing: 'border-box',
              background: 'white',
              zIndex: 1000,
              resize: 'none',
              outline: 'none',
              textAlign: elements.find(e => e.id === editingId)?.textAlign || 'center',
            }}
          />
        )}

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

