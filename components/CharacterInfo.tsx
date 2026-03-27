import React from 'react';

interface TrainerInfoProps {
  name: string;
  pokemonCount: number;
}

const TrainerInfo = ({ name, pokemonCount }: TrainerInfoProps) => {
  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-6 w-full group items-stretch">
      {/* Trainer Card Base */}
      <div className="flex-1 bg-[#FCA5A5] border-b-[4px] md:border-[4px] border-[#374151] md:rounded-[32px] p-8 md:p-10 text-[#374151] overflow-hidden relative flex flex-col items-center justify-center text-center">
        <div className="bg-white/40 border-[3px] border-[#374151] rounded-xl px-5 py-2 mb-6 inline-block rotate-[-2deg] group-hover:rotate-[2deg] transition-transform">
          <h2 className="text-xl md:text-2xl uppercase tracking-[0.2em] font-black leading-none mt-1">⭐ Lisensi Penjelajah</h2>
        </div>
        <h1 className="text-6xl md:text-[5rem] font-black tracking-tight leading-none">{name}</h1>
      </div>

      {/* Stats Column */}
      <div className="flex flex-col gap-0 md:gap-6 w-full md:w-[280px] shrink-0">
        {/* Koleksi */}
        <div className="flex-1 bg-[#93C5FD] border-b-[4px] md:border-[4px] border-[#374151] md:rounded-[32px] flex flex-col items-center justify-center py-8 md:py-0 relative overflow-hidden group/koleksi hover:-translate-y-1 transition-transform min-h-[180px]">
          <div className="w-full flex items-center justify-center relative px-4 mb-4">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-b-[4px] border-dashed border-[#374151] opacity-30 z-0"></div>
            <div className="bg-[#BFDBFE] border-[3px] border-[#374151] px-6 py-2 rounded-xl z-10">
              <h3 className="text-[#374151] text-lg font-black uppercase tracking-widest leading-none mt-0.5">Koleksi</h3>
            </div>
          </div>
          <div className="text-7xl md:text-[6rem] font-black text-[#374151] group-hover/koleksi:scale-110 transition-transform leading-none">
            {pokemonCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerInfo;
