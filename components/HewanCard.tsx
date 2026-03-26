'use client'

import React from 'react';
import { Wind, Leaf, Droplets, Sparkles, Star, PawPrint, Circle } from 'lucide-react';

interface PokemonCardProps {
  name?: string;
  level?: number;
  exp?: number;
  element?: string;
  creatureType?: string;
  image?: string;
  isEmpty?: boolean;
}

const elementBg: Record<string, string> = {
  Angin: 'bg-[#BAE6FD]',
  Tanah: 'bg-[#D9F5D0]',
  Air: 'bg-[#BFDBFE]',
};

const ElementIcon = ({ element, className }: { element?: string; className?: string }) => {
  if (element === 'Angin') return <Wind className={className} strokeWidth={2.5} />;
  if (element === 'Tanah') return <Leaf className={className} strokeWidth={2.5} />;
  if (element === 'Air') return <Droplets className={className} strokeWidth={2.5} />;
  return <PawPrint className={className} strokeWidth={2.5} />;
};

const PokemonCard = ({ name, level = 1, exp = 0, element, creatureType, image, isEmpty }: PokemonCardProps) => {
  // Empty slot (Match Image Visual)
  if (isEmpty || !name) {
    return (
      <div className="w-[300px] bg-[#E5E7EB] border-[3px] border-[#9CA3AF] border-dashed rounded-[32px] p-2 flex items-center cursor-pointer hover:bg-[#D1D5DB] transition-all group shrink-0">
        <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#9CA3AF] border-dashed flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <span className="text-[#9CA3AF] text-3xl font-black">+</span>
        </div>
        <div className="ml-4 bg-white/70 px-4 py-1.5 rounded-xl flex items-center justify-center">
          <span className="text-[#9CA3AF] text-lg uppercase font-black tracking-widest leading-none mt-1">
            Kosong
          </span>
        </div>
      </div>
    );
  }

  const bgClass = elementBg[element || ''] || 'bg-[#FCA5A5]';
  const xpToNext = 30 + (level || 1) * 20;
  const expPercent = Math.min(100, Math.round((exp / xpToNext) * 100));

  return (
    <div className="w-[340px] bg-white border-[4px] border-[#374151] rounded-[32px] p-2 pr-5 flex items-center cursor-pointer hover:-translate-y-1 hover:shadow-sm transition-all relative group shrink-0">

      {/* Sprite / Icon area */}
      <div className={`w-[72px] h-[72px] ${bgClass} border-[3px] border-[#374151] rounded-full shrink-0 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform`}>
        {image ? (
          <img src={image} alt={name} className="object-contain p-2 drop-shadow-md w-full h-full" />
        ) : (
          <ElementIcon element={element} className="w-8 h-8 text-[#374151]" />
        )}
      </div>

      {/* Info */}
      <div className="ml-4 flex-1 flex flex-col justify-center">
        {/* Row 1: Name & Level */}
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xl md:text-2xl font-black uppercase text-[#374151] leading-none mt-1 max-w-[120px] truncate">
            {name}
          </h3>
          <div className="flex items-center bg-[#FEF08A] px-2 py-0.5 rounded-xl border-[2.5px] border-[#374151] gap-1 -mt-1 shadow-sm">
            <Star className="w-3 h-3 text-[#374151]" fill="currentColor" />
            <span className="text-[#374151] text-xs font-black tracking-widest leading-none mt-0.5">LV.{level}</span>
          </div>
        </div>

        {/* Row 2: Type tag */}
        {(element || creatureType) && (
          <div className="flex items-center gap-1.5 mb-2.5">
            {element && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#6B7280]">
                <ElementIcon element={element} className="w-3.5 h-3.5" />
                {element}
              </span>
            )}
            {element && creatureType && (
              <Circle className="w-[5px] h-[5px] text-[#9CA3AF]" strokeWidth={3} />
            )}
            {creatureType && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-[#6B7280]">
                {creatureType}
              </span>
            )}
          </div>
        )}

        {/* Row 3: EXP Bar */}
        <div className="flex items-center w-full">
          <div className="bg-[#374151] text-white text-[9px] font-black px-1.5 py-[2px] rounded border-[1.5px] border-[#374151] leading-none shrink-0 tracking-wider">
            EXP
          </div>
          <div className="flex-1 h-3 bg-white border-[2.5px] border-[#374151] rounded-full mx-2 overflow-hidden relative">
            <div className="w-full bg-white h-full relative">
              <div className="bg-[#4ADE80] h-full transition-all" style={{ width: `${expPercent}%` }} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#6B7280] leading-none mt-0.5 shrink-0">
            {exp}/{xpToNext}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;
