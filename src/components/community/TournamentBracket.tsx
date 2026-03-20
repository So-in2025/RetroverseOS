import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Swords, User } from 'lucide-react';

interface BracketProps {
  tournamentTitle: string;
  onClose: () => void;
}

export default function TournamentBracket({ tournamentTitle, onClose }: BracketProps) {
  // Generate deterministic bracket based on title
  const generateBracket = (title: string) => {
    const seed = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const players = [
      'NEXUS_ONE', 'CyberKai', 'PixelQueen', 'GlitchRunner', 
      'RetroKing', 'VoidWalker', 'NeonSamurai', 'BitHunter'
    ];
    
    // Shuffle players based on seed
    const shuffled = [...players].sort(() => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x) - 0.5;
    });

    const qf = [
      { id: 1, p1: shuffled[0], p2: shuffled[1], s1: 2, s2: 1, winner: 1 },
      { id: 2, p1: shuffled[2], p2: shuffled[3], s1: 0, s2: 2, winner: 2 },
      { id: 3, p1: shuffled[4], p2: shuffled[5], s1: 2, s2: 0, winner: 1 },
      { id: 4, p1: shuffled[6], p2: shuffled[7], s1: 1, s2: 2, winner: 2 },
    ];

    const sf = [
      { id: 5, p1: qf[0].p1, p2: qf[1].p2, s1: 2, s2: 0, winner: 1 },
      { id: 6, p1: qf[2].p1, p2: qf[3].p2, s1: 1, s2: 2, winner: 2 },
    ];

    const f = [
      { id: 7, p1: sf[0].p1, p2: sf[1].p2, s1: null, s2: null, winner: null },
    ];

    return [
      { name: 'Quarter-Finals', matches: qf },
      { name: 'Semi-Finals', matches: sf },
      { name: 'Grand Finals', matches: f }
    ];
  };

  const rounds = generateBracket(tournamentTitle);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/90 backdrop-blur-xl"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              {tournamentTitle}
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Live Bracket Progression</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
            <Swords className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto p-8 md:p-12 scrollbar-hide">
          <div className="flex gap-12 md:gap-24 min-w-max items-center h-full">
            {rounds.map((round, roundIdx) => (
              <div key={round.name} className="flex flex-col gap-12 md:gap-24">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] text-center mb-4">
                  {round.name}
                </h3>
                <div className="flex flex-col justify-around gap-16 flex-1">
                  {round.matches.map((match) => (
                    <div key={match.id} className="relative">
                      <div className="w-48 md:w-64 bg-zinc-950 border border-white/5 rounded-xl overflow-hidden shadow-xl">
                        {/* Player 1 */}
                        <div className={`flex items-center justify-between p-3 border-b border-white/5 ${match.winner === 1 ? 'bg-emerald-500/5' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${match.winner === 1 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-800'}`} />
                            <span className={`text-xs font-bold truncate ${match.winner === 1 ? 'text-white' : 'text-zinc-500'}`}>{match.p1}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-zinc-400">{match.s1 ?? '-'}</span>
                        </div>
                        {/* Player 2 */}
                        <div className={`flex items-center justify-between p-3 ${match.winner === 2 ? 'bg-emerald-500/5' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${match.winner === 2 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-800'}`} />
                            <span className={`text-xs font-bold truncate ${match.winner === 2 ? 'text-white' : 'text-zinc-500'}`}>{match.p2}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-zinc-400">{match.s2 ?? '-'}</span>
                        </div>
                      </div>

                      {/* Connector Lines */}
                      {roundIdx < rounds.length - 1 && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center">
                          <div className="w-6 md:w-12 h-px bg-white/10" />
                          <div className={`h-[100%] border-r border-white/10 ${match.id % 2 === 0 ? '-translate-y-1/2 rounded-tr-xl' : 'translate-y-1/2 rounded-br-xl'}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-zinc-950/50 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Active Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scheduled</span>
            </div>
          </div>
          <button className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20">
            Join Spectator Mode
          </button>
        </div>
      </motion.div>
    </div>
  );
}
