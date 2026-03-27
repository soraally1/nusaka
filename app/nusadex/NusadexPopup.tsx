"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { Power, Search, Loader2, ChevronLeft } from "lucide-react";
import { useJoystickStore } from "../game/store";
import { NUSA_CREATURES, type Creature } from "./creatures";
import { useCreatureStore, type PartnerCreature } from "./store";
import { useNotifStore } from "./notifStore";

const Creature3D = dynamic(() => import("./Creature3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-2xl animate-pulse" />
  ),
});

export default function NusadexPopup() {
  const isNusadexOpen = useJoystickStore((s) => s.isNusadexOpen);
  const setNusadexOpen = useJoystickStore((s) => s.setNusadexOpen);
  const { capturedCreatures, seenIds, markAsSeen } = useCreatureStore();
  const { setHasNewNotif } = useNotifStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCreature, setSelectedCreature] = useState<PartnerCreature | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");
  const [isClosing, setIsClosing] = useState(false);

  // New: Persistence states
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isNusadexOpen) {
      setHasBeenOpened(true);
      setIsVisible(true);
      setIsClosing(false);
    } else if (hasBeenOpened) {
      if (!isClosing) handleClose();
    }
  }, [isNusadexOpen]);

  // Update overall notification status when opening/closing or when caught
  useEffect(() => {
    const hasUnseen = capturedCreatures.some((c) => !seenIds.includes(c.id));
    setHasNewNotif(hasUnseen);
  }, [capturedCreatures, seenIds]);

  const filteredCreatures = useMemo(() => {
    // Only show creatures that have been captured
    return capturedCreatures.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toString().padStart(4, "0").includes(searchTerm),
    );
  }, [capturedCreatures, searchTerm]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setNusadexOpen(false);
      setIsClosing(false);
      setView("list");
      setSelectedCreature(null);
    }, 450);
  };

  const handleSelect = (creature: any) => {
    setSelectedCreature(creature);
    setView("detail");
    markAsSeen(creature.id);

    // Sync seen status to Firestore
    import("../../lib/firebase").then(({ db, auth }) => {
      import("firebase/firestore").then(({ doc, updateDoc, arrayUnion }) => {
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, "players", user.uid), {
            seenIds: arrayUnion(creature.id),
          }).catch((e) => console.error("Error syncing seenId", e));
        }
      });
    });
  };

  // Lazy load only after first interaction to save initial page load performance
  if (!hasBeenOpened) return null;

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 transition-all duration-300
        ${isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500 
          ${isClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      />

      {/* Main Device Container */}
      <div
        className={`relative w-full max-w-sm bg-[#FFFDF0] border-[8px] border-[#374151] rounded-[3rem] shadow-[12px_12px_0px_#374151] transform overflow-hidden
          ${isClosing ? "animate-screen-off" : isVisible ? "animate-screen-on" : ""}`}
        style={{
          height: "85vh",
          maxHeight: "750px",
          fontFamily: "var(--font-nanum-pen)",
        }}
      >
        {/* Phone Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#374151] rounded-b-3xl z-50 flex items-center justify-center gap-2">
          {/* Camera Lens */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#111827] border border-[#4B5563]"></div>
          {/* Speaker */}
          <div className="w-10 h-1 rounded-full bg-[#111827]"></div>
        </div>

        {/* Side physical buttons (visual only) */}
        <div className="absolute top-24 -left-3 w-1.5 h-12 bg-[#374151] rounded-l-md z-[-1]"></div>
        <div className="absolute top-40 -left-3 w-1.5 h-16 bg-[#374151] rounded-l-md z-[-1]"></div>
        <div className="absolute top-32 -right-3 w-1.5 h-16 bg-[#374151] rounded-r-md z-[-1]"></div>

        <div className="flex flex-col h-full relative z-10 pt-10">
          {/* Header Section */}
          <div className="flex items-center justify-between px-6 mb-4">
            <div className="flex items-center gap-2">
              {view === "detail" && (
                <button
                  onClick={() => setView("list")}
                  className="p-1 hover:bg-[#374151]/10 rounded-full transition-transform active:scale-90 cursor-pointer"
                >
                  <ChevronLeft
                    className="w-8 h-8 text-[#374151]"
                    strokeWidth={3}
                  />
                </button>
              )}
              <h2 className="text-4xl font-black text-[#374151] tracking-wider drop-shadow-[2px_2px_0_#FFF]">
                {view === "list" ? "NUSADEX" : "DETAIL"}
              </h2>
            </div>
            {view === "list" && (
              <button
                onClick={handleClose}
                className="p-1.5 bg-red-100 hover:bg-red-200 border-2 border-red-500 rounded-full transition-transform active:scale-90 cursor-pointer shadow-[2px_2px_0_#EF4444]"
              >
                <Power className="w-6 h-6 text-red-600" strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* List View */}
            {view === "list" && (
              <div className="flex flex-col h-full px-6 animate-in fade-in slide-in-from-left duration-300">
                <div className="relative mb-6">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search
                      className="w-6 h-6 text-[#374151]"
                      strokeWidth={3}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari Anomali..."
                    className="w-full bg-white border-[3px] border-[#374151] rounded-2xl pl-12 pr-4 py-3 text-3xl focus:outline-none placeholder-[#374151]/40 text-[#374151] shadow-[4px_4px_0_#374151]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                  <div className="grid grid-cols-2 gap-4">
                    {filteredCreatures.map((creature, i) => {
                      const isNew = !seenIds.includes(creature.id);
                      return (
                        <div
                          key={creature.instanceId || `${creature.id}-${i}`}
                          onClick={() => handleSelect(creature)}
                          className={`group flex flex-col bg-white border-[3px] border-[#374151] rounded-2xl transition-all cursor-pointer p-3 overflow-hidden shadow-[4px_4px_0_#374151] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0_0_0_#374151] relative ${isNew ? "ring-4 ring-red-400 ring-inset" : ""}`}
                        >
                          {isNew && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-[#374151] z-20 animate-bounce shadow-[1px_1px_0_#374151]">
                              NEW
                            </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xl font-bold text-[#374151] bg-[#FFE4A0] border-2 border-[#374151] px-2 py-0.5 rounded-md shadow-[2px_2px_0_#374151] rotate-[-2deg]">
                              #{(i + 1).toString().padStart(3, "0")}
                            </span>
                          </div>
                          <div className="relative w-full aspect-square bg-[#E5F6FD] border-[3px] border-[#374151] rounded-xl flex items-center justify-center overflow-hidden pointer-events-none">
                            <Suspense
                              fallback={
                                <Loader2 className="w-6 h-6 animate-spin text-[#374151]" />
                              }
                            >
                              <Creature3D
                                modelUrl={creature.modelUrl}
                                autoRotate={false}
                                scale={creature.scale || 1}
                                position={creature.position || [0, 0, 0]}
                              />
                            </Suspense>
                          </div>
                          <h3 className="text-[26px] text-[#374151] font-black mt-3 text-center truncate w-full tracking-wide">
                            {creature.nickname || creature.name}
                          </h3>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="text-base font-black text-[#374151] bg-[#FEF08A] border-[2px] border-[#374151] px-2 py-0.5 rounded-lg shadow-[1px_1px_0_#374151]">
                              Lv.{creature.level || 1}
                            </span>
                            <span className="text-xs font-bold text-[#374151]/50">EXP {creature.exp}/{30 + (creature.level || 1) * 20}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Detail View */}
            {view === "detail" && selectedCreature && (
              <div className="flex flex-col h-full px-6 animate-in fade-in slide-in-from-right duration-300 overflow-y-auto custom-scrollbar pb-8 pt-2">
                <h2 className="text-[3.5rem] text-[#374151] font-black leading-none uppercase drop-shadow-[2px_2px_0_#fff]">
                  {selectedCreature.nickname || selectedCreature.name}
                </h2>
                <div className="flex items-center justify-between mb-4 mt-2">
                  <span
                    className={`text-2xl text-[#374151] font-bold px-4 border-[3px] border-[#374151] rounded-xl shadow-[2px_2px_0_#374151] rotate-[-2deg] flex items-center justify-center gap-2 h-8 ${selectedCreature.element === "Tanah" ? "bg-[#D97706]/20" : selectedCreature.element === "Angin" ? "bg-[#93C5FD]/20" : "bg-[#3B82F6]/20"}`}
                  >
                    <span className="opacity-60 text-lg uppercase">
                      Elemen:
                    </span>
                    {selectedCreature.element}
                  </span>
                  <span className="text-4xl font-black text-[#374151]/60">
                    No. {selectedCreature.id.toString().padStart(3, "0")}
                  </span>
                </div>

                {/* 3D Model Display */}
                <div className="relative w-full aspect-[4/3] shrink-0 bg-[#E5F6FD] rounded-[2rem] border-[4px] border-[#374151] shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)] mb-6 flex items-center justify-center overflow-hidden">
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#374151_2px,transparent_2px)] [background-size:16px_16px]"></div>
                  <Suspense
                    fallback={
                      <Loader2 className="w-8 h-8 animate-spin text-[#374151]" />
                    }
                  >
                    <Creature3D
                      key={selectedCreature.id}
                      modelUrl={selectedCreature.modelUrl}
                      autoRotate={false}
                      scale={(selectedCreature.scale || 1) * 2.2}
                      position={selectedCreature.position || [0, 0, 0]}
                    />
                  </Suspense>
                </div>

                {/* Progression Stats */}
                <div className="mb-6 px-1">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-4xl font-black text-[#374151]">
                      Level {selectedCreature.level || 1}
                    </span>
                    <span className="text-2xl text-[#374151] font-bold opacity-80 mt-2">
                      EXP {selectedCreature.exp}/{30 + (selectedCreature.level || 1) * 20}
                    </span>
                  </div>
                  <div className="w-full h-5 bg-white border-[3px] border-[#374151] rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
                    <div
                      className="h-full bg-[#4ADE80] border-r-[3px] border-[#374151]"
                      style={{ width: `${Math.min(100, Math.round(((selectedCreature.exp || 0) / (30 + (selectedCreature.level || 1) * 20)) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-4 border-[3px] border-[#374151] rounded-2xl shadow-[4px_4px_0_#374151] relative">
                    {/* Fake pin decoration */}
                    <div className="absolute -top-3 left-4 w-4 h-4 rounded-full bg-red-500 border-2 border-[#374151] shadow-[1px_1px_0_#374151]"></div>
                    <p className="text-3xl text-[#374151] leading-tight pt-2">
                      "{selectedCreature.description}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white rounded-2xl border-[3px] border-[#374151] shadow-[4px_4px_0_#374151] overflow-hidden flex flex-col">
                      <div className="bg-[#FDE047] border-b-[3px] border-[#374151] py-2 text-center">
                        <span className="text-xl text-[#374151] font-black uppercase tracking-[0.2em]">
                          Habitat
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-3 min-h-[70px]">
                        <span className="text-[26px] text-[#374151] font-bold leading-tight text-center">
                          {selectedCreature.habitat}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border-[3px] border-[#374151] shadow-[4px_4px_0_#374151] overflow-hidden flex flex-col">
                      <div className="bg-[#FCA5A5] border-b-[3px] border-[#374151] py-2 text-center">
                        <span className="text-xl text-[#374151] font-black uppercase tracking-[0.2em]">
                          Status
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-3 min-h-[70px]">
                        <span className="text-[26px] text-[#374151] font-bold leading-tight text-center">
                          {selectedCreature.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device UI Decoration */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#4a4a4a]/40 rounded-full" />

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4a4a4a11;
            border-radius: 10px;
          }

          @keyframes screenOn {
            0% {
              transform: scale(0.1, 0.001);
              opacity: 0;
            }
            40% {
              transform: scale(1, 0.005);
              opacity: 1;
            }
            100% {
              transform: scale(1, 1);
              opacity: 1;
            }
          }
          @keyframes screenOff {
            0% {
              transform: scale(1, 1);
              opacity: 1;
            }
            30% {
              transform: scale(1, 0.005);
              opacity: 1;
            }
            100% {
              transform: scale(0, 0);
              opacity: 0;
            }
          }
          .animate-screen-on {
            animation: screenOn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          .animate-screen-off {
            animation: screenOff 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
