import React from 'react';
import { Circle, Rect, Group, Text, RegularPolygon } from 'react-konva';
import { LayoutElement, SCALE } from '../types';

interface ElementProps {
  element: LayoutElement;
  isSelected: boolean;
  onSelect: (isMulti: boolean) => void;
  onChange: (newAttrs: Partial<LayoutElement>) => void;
  onUpdateMany: (newAttrs: Partial<LayoutElement>) => void;
  onMoveMany: (dx: number, dy: number) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onDblClick?: (id: string, x: number, y: number, width: number, height: number, text: string) => void;
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
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
  selectedIds,
  draggable = true
}) => {
  const isRound = element.type === 'round-table' || element.type === 'cake-table' || element.type === 'custom-circle';
  const isTextBox = element.type === 'text-box';
  
  const handleDragStart = (e: any) => {
    if (onDragStart) {
      onDragStart(element.id);
    }
  };

  const handleDragMove = (e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();

    if (onDragMove) {
      onDragMove(element.id, newX, newY);
    }
  };

  const handleDragEnd = (e: any) => {
    const newX = e.target.x();
    const newY = e.target.y();

    if (onDragEnd) {
      onDragEnd(element.id, newX, newY);
    }
  };

  const handleSelect = (e: any) => {
    const isMulti = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
    onSelect(isMulti);
  };

  const handleDblClick = (e: any) => {
    if (onDblClick && (element.type === 'text-box' || element.label)) {
      const absPos = e.target.getAbsolutePosition();
      
      onDblClick(
        element.id,
        absPos.x,
        absPos.y,
        element.width * SCALE,
        element.height * SCALE,
        element.type === 'text-box' ? (element.text || '') : (element.label || '')
      );
    }
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
        const label = element.chairLabels?.[i];
        
        chairs.push(
          <Group key={`chair-group-${i}`}>
            <Rect
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
            {label && (
              <Text
                text={label}
                x={Math.cos(angle) * (distance + 15)}
                y={Math.sin(angle) * (distance + 15)}
                fontSize={8}
                fill="#6b7280"
                align="center"
                width={60}
                offsetX={30}
                offsetY={4}
                rotation={(angle * 180) / Math.PI + 90}
              />
            )}
          </Group>
        );
      }
    } else if (element.type === 'akad-table') {
      const w = element.width * SCALE;
      const h = element.height * SCALE;
      
      // Specific layout for Akad Table: 2 top, 2 bottom, 1 left, 1 right
      // We'll use a pattern based on index
      for (let i = 0; i < count; i++) {
        let cx = 0;
        let cy = 0;
        const label = element.chairLabels?.[i];
        
        if (i < 2) { // Top
          cx = (i === 0 ? -w/4 : w/4) - chairSize / 2;
          cy = -h/2 - chairSize - 5;
        } else if (i < 4) { // Bottom
          cx = (i === 2 ? -w/4 : w/4) - chairSize / 2;
          cy = h/2 + 5;
        } else if (i === 4) { // Left
          cx = -w/2 - chairSize - 5;
          cy = -chairSize / 2;
        } else if (i === 5) { // Right
          cx = w/2 + 5;
          cy = -chairSize / 2;
        } else {
          // Fallback for more than 6 chairs: distribute on sides
          const side = i % 4;
          const offset = Math.floor(i / 4) * 20;
          if (side === 0) { cx = -w/2 + offset; cy = -h/2 - chairSize - 5; }
          else if (side === 1) { cx = -w/2 + offset; cy = h/2 + 5; }
          else if (side === 2) { cx = -w/2 - chairSize - 5; cy = -h/2 + offset; }
          else { cx = w/2 + 5; cy = -h/2 + offset; }
        }

        chairs.push(
          <Group key={`chair-group-${i}`}>
            <Rect
              x={cx}
              y={cy}
              width={chairSize}
              height={chairSize}
              fill="#e5e7eb"
              stroke="#9ca3af"
              strokeWidth={1}
              cornerRadius={4}
            />
            {label && (
              <Text
                text={label}
                x={cx + chairSize / 2}
                y={cy < -h/2 ? cy - 10 : cy + chairSize + 2}
                fontSize={8}
                fill="#6b7280"
                align="center"
                width={60}
                offsetX={30}
              />
            )}
          </Group>
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
        const label = element.chairLabels?.[i];
        
        const cx = spacing * (index + 1) - chairSize / 2 - w/2;
        const cy = side === 0 ? -h/2 - chairSize - 5 : h/2 + 5;

        chairs.push(
          <Group key={`chair-group-${i}`}>
            <Rect
              x={cx}
              y={cy}
              width={chairSize}
              height={chairSize}
              fill="#e5e7eb"
              stroke="#9ca3af"
              strokeWidth={1}
              cornerRadius={4}
            />
            {label && (
              <Text
                text={label}
                x={cx + chairSize / 2}
                y={side === 0 ? cy - 10 : cy + chairSize + 2}
                fontSize={8}
                fill="#6b7280"
                align="center"
                width={60}
                offsetX={30}
              />
            )}
          </Group>
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

    if (isTextBox) {
      const isEmpty = !element.text || element.text.trim() === '';
      return (
        <Group>
          <Rect
            width={element.width * SCALE}
            height={element.height * SCALE}
            x={-(element.width * SCALE) / 2}
            y={-(element.height * SCALE) / 2}
            fill={isEmpty ? 'rgba(0,0,0,0.02)' : 'transparent'}
            stroke={isSelected ? '#d4af37' : (isEmpty ? '#e5e7eb' : 'transparent')}
            strokeWidth={1}
            dash={isSelected || isEmpty ? [5, 5] : undefined}
          />
          <Text
            text={isEmpty ? (isSelected ? '' : 'Empty Text Box') : element.text}
            fontSize={element.fontSize || 16}
            fontFamily={element.fontFamily || 'Inter'}
            fontStyle={`${element.isItalic ? 'italic ' : ''}${element.isBold ? 'bold' : ''}`.trim() || 'normal'}
            fill={isEmpty ? '#d1d5db' : (element.color || '#000000')}
            align={element.textAlign || 'center'}
            width={element.width * SCALE}
            height={element.height * SCALE}
            x={-(element.width * SCALE) / 2}
            y={-(element.height * SCALE) / 2}
            verticalAlign="middle"
            padding={5}
          />
        </Group>
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

    if (element.type === 'custom-triangle' || element.type === 'custom-hexagon') {
      return (
        <RegularPolygon
          sides={element.type === 'custom-triangle' ? 3 : 6}
          radius={(element.radius || 1) * SCALE}
          fill={element.color || '#ffffff'}
          stroke={isSelected ? '#d4af37' : '#374151'}
          strokeWidth={isSelected ? 3 : 1}
          shadowBlur={isSelected ? 10 : 0}
        />
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
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    >
      {renderChairs()}
      {renderShape()}
      
      {element.label && !isTextBox && (
        <Text
          text={element.label}
          fontSize={element.fontSize || (element.type === 'chair' ? 8 : 10)}
          fontFamily={element.fontFamily || 'Inter'}
          fontStyle={`${element.isItalic ? 'italic ' : ''}${element.isBold !== false ? 'bold' : ''}`.trim() || 'normal'}
          fill={element.type === 'stage' ? '#ffffff' : '#374151'}
          align={element.textAlign || 'center'}
          width={element.type === 'chair' ? 60 : 100}
          x={element.type === 'chair' ? -30 : -50}
          y={element.type === 'chair' ? -20 : -5}
        />
      )}
    </Group>
  );
};
