import React, { useImperativeHandle, useState, forwardRef } from 'react';
import { Layer, Line } from 'react-konva';

export interface GuidesHandle {
  setGuides: (guides: number[][]) => void;
}

export const Guides = forwardRef<GuidesHandle, {}>((_, ref) => {
  const [guides, setGuides] = useState<number[][]>([]);

  useImperativeHandle(ref, () => ({
    setGuides: (newGuides: number[][]) => {
      setGuides(newGuides);
    }
  }));

  if (guides.length === 0) return null;

  return (
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
  );
});

Guides.displayName = 'Guides';
