import React from 'react';
import { Tile } from '../types';
import { getTileImageSrc } from '../constants';

interface TileComponentProps {
  tile: Tile;
  onClick?: () => void;
  selected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  removable?: boolean;
}

const TileComponent: React.FC<TileComponentProps> = ({ 
  tile, 
  onClick, 
  selected = false, 
  size = 'md',
  removable = false
}) => {
  
  // Dimensions tailored for FluffyStuff aspect ratio (approx 3:4)
  const sizeClasses = {
    xs: "w-[8.5vw] max-w-[34px] h-[11.5vw] max-h-[46px]", // Responsive grid for top input
    sm: "w-[36px] h-[48px]", // Standard small
    md: "w-[48px] h-[64px]", // Hand display
    lg: "w-[60px] h-[80px]", // Analysis result
  };

  return (
    <div 
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center 
        rounded-[3px] select-none cursor-pointer
        transition-all duration-150 active:scale-95
        ${sizeClasses[size]}
        ${selected ? 'ring-2 ring-yellow-400 -translate-y-1' : ''}
        ${removable ? 'shadow-lg' : 'shadow-[1px_1px_2px_rgba(0,0,0,0.3)]'}
        bg-white
      `}
      style={{
        // Add a subtle 3D effect manually since we are using flat SVGs
        boxShadow: removable 
          ? '1px 3px 6px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.1)' 
          : undefined
      }}
    >
      <img 
        src={getTileImageSrc(tile)} 
        alt={`${tile.suit}-${tile.value}`} 
        className="w-full h-full object-fill rounded-[3px]"
        loading="lazy"
        draggable={false}
      />
      
      {/* Hubei Style: Add border to White Dragon (Haku) if it looks blank */}
      {tile.suit === 'zihai' && tile.value === 5 && (
        <div className="absolute inset-1 border border-gray-300 opacity-30 pointer-events-none rounded-[2px]" />
      )}

      {removable && (
        <div className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-md z-10 border border-[#0a1f12]">
          ×
        </div>
      )}
    </div>
  );
};

export default TileComponent;