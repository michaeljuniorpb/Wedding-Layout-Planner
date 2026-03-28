import React from 'react';
import { Circle, Rect, Group, Text } from 'react-konva';
import { LayoutElement, SCALE } from '../types';

interface ElementProps {
  element: LayoutElement;
  isSelected: boolean;
  onSelect: (isMulti: boolean) => void;
  onChange: (newAttrs: Partial<LayoutElement>) => void;
  onUpdateMany: (newAttrs: Partial<LayoutElement>) => void;
  onMoveMany: (dx: number, dy: number) => void;
  selectedIds: string[];
  draggable?: boolean;
}

export const CanvasElement: React.FC<ElementProps> = ({ 
  element, 
  isSelected, 
  onSelect, 
  onChange,
  onUpdateMany,
  onMoveMany,
  selectedIds,
  draggable = true
}) => {
  const isRound = element.type === 'round-table' || element.type === 'cake-table';
  const dragStartPos = React.useRef<{ x: number, y: number } | null>(null);
  
  const handleDragStart = (e: any) => {
    if (isSelected) {
      dragStartPos.current = { x: e.target.x(), y: e.target.y() };
    }
  };

  const handleDragMove = (e: any) => {
    if (!isSelected || selectedIds.length <= 1 || !dragStartPos.current) return;

    const dx = e.target.x() - dragStartPos.current.x;
    const dy = e.target.y() - dragStartPos.current.y;

    // Move other selected elements visually
    const stage = e.target.getStage();
    selectedIds.forEach(id => {
      if (id === element.id) return;
      const node = stage.findOne(`#${id}`);
      if (node) {
        // We use the element's current state position + delta
        const el = (node as any).attrs.elementData;
        node.x(el.x + dx);
        node.y(el.y + dy);
      }
    });
  };

  const handleDragEnd = (e: any) => {
    if (isSelected && selectedIds.length > 1 && dragStartPos.current) {
      const dx = e.target.x() - dragStartPos.current.x;
      const dy = e.target.y() - dragStartPos.current.y;
      
      onMoveMany(dx, dy);
      dragStartPos.current = null;
    } else {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      });
    }
  };

  const handleSelect = (e: any) => {
    const isMulti = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
    onSelect(isMulti);
  };

  const renderChairs = () => {
    if (!element.chairCount) return null;
    
    const chairs = [];
    const count = element.chairCount;
    const chairSize = 0.4 * SCALE;
    
    if (isRound) {
      const radius = (element.radius || 0.9) * SCALE;
      const distance = radius + 15;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        chairs.push(
          <Rect
            key={`chair-${i}`}
            x={Math.cos(angle) * distance}
            y={Math.sin(angle) * distance}
            width={chairSize}
            height={chairSize}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={1}
            cornerRadius={4}
            rotation={(angle * 180) / Math.PI + 90}
            offsetX={chairSize / 2}
            offsetY={chairSize / 2}
          />
        );
      }
    } else if (element.type === 'long-table' || element.type === 'vip-table') {
      const w = element.width * SCALE;
      const h = element.height * SCALE;
      const isVip = element.type === 'vip-table';
      const chairsPerSide = isVip ? count : Math.ceil(count / 2);
      
      for (let i = 0; i < count; i++) {
        const side = isVip ? 1 : (i < chairsPerSide ? 0 : 1);
        const index = isVip ? i : (i % chairsPerSide);
        const spacing = w / (chairsPerSide + 1);
        
        chairs.push(
          <Rect
            key={`chair-${i}`}
            x={spacing * (index + 1) - chairSize / 2 - w/2}
            y={side === 0 ? -h/2 - chairSize - 5 : h/2 + 5}
            width={chairSize}
            height={chairSize}
            fill="#e5e7eb"
            stroke="#9ca3af"
            strokeWidth={1}
            cornerRadius={4}
          />
        );
      }
    }
    return chairs;
  };

  const renderShape = () => {
    if (isRound) {
      return (
        <Circle
          radius={(element.radius || 0.9) * SCALE}
          fill={element.color || '#ffffff'}
          stroke={isSelected ? '#d4af37' : '#374151'}
          strokeWidth={isSelected ? 3 : 1}
          shadowBlur={isSelected ? 10 : 0}
        />
      );
    }

    if (element.type === 'arch') {
      return (
        <Group>
          <Rect
            width={element.width * SCALE}
            height={element.height * SCALE}
            x={-(element.width * SCALE) / 2}
            y={-(element.height * SCALE) / 2}
            fill="transparent"
            stroke={isSelected ? '#d4af37' : '#d4af37'}
            strokeWidth={4}
            dash={[10, 5]}
          />
          <Circle
            radius={10}
            x={-(element.width * SCALE) / 2}
            y={0}
            fill="#d4af37"
          />
          <Circle
            radius={10}
            x={(element.width * SCALE) / 2}
            y={0}
            fill="#d4af37"
          />
        </Group>
      );
    }

    return (
      <Rect
        width={element.width * SCALE}
        height={element.height * SCALE}
        x={-(element.width * SCALE) / 2}
        y={-(element.height * SCALE) / 2}
        fill={element.color || '#ffffff'}
        stroke={isSelected ? '#d4af37' : '#374151'}
        strokeWidth={isSelected ? 3 : 1}
        cornerRadius={element.type === 'stage' ? 0 : element.type === 'centerpiece' ? 10 : 4}
        shadowBlur={isSelected ? 10 : 0}
      />
    );
  };

  return (
    <Group
      id={element.id}
      elementData={element}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleSelect}
      onTap={handleSelect}
    >
      {renderChairs()}
      {renderShape()}
      
      {element.label && (
        <Text
          text={element.label}
          fontSize={10}
          fontFamily="Inter"
          fill={element.type === 'stage' ? '#ffffff' : '#374151'}
          align="center"
          width={100}
          x={-50}
          y={isRound ? -5 : -5}
          fontStyle="bold"
        />
      )}
    </Group>
  );
};
