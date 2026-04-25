import { useMemo } from 'react';

export function GeometricBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 select-none flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Repeating patterns of the geometric boxes */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="absolute"
            style={{
              top: `${20 + (i * 15)}%`,
              left: `${10 + (i * 12)}%`,
              transform: `scale(${0.5 + (i * 0.1)}) rotate(${i * 45}deg)`,
            }}
          >
            <div className="geometric-container">
              <span className="box1"></span>
              <span className="box2"></span>
              <span className="box3"></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
