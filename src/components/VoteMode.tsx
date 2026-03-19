import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Users, Play, Clock, Trophy, ArrowLeft, UserPlus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ect1Data from '../data/ect1.json';
import ect2Data from '../data/ect2.json';

const allData = { ...ect1Data, ...ect2Data };

type VoteState = 'idle' | 'waiting' | 'voting' | 'results';

interface ServerState {
  roomId: string;
  roomName: string;
  state: VoteState;
  players: { id: string, name: string }[];
  candidates: string[];
  votes: Record<string, string[]>;
  totalVotes: number;
  timeLeft: number;
  hasHost: boolean;
}

interface RoomInfo {
  id: string;
  name: string;
  state: string;
  playerCount: number;
}

const socket: Socket = io();

export default function VoteMode({ onBack, namesList }: { onBack: () => void, namesList: string[] }) {
  const [role, setRole] = useState<'none' | 'host' | 'player'>('none');
  const [playerName, setPlayerName] = useState('');
  const [serverState, setServerState] = useState<ServerState>({
    roomId: '',
    roomName: '',
    state: 'idle',
    players: [],
    candidates: [],
    votes: {},
    totalVotes: 0,
    timeLeft: 0,
    hasHost: false
  });
  const [roomsList, setRoomsList] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [voteDuration, setVoteDuration] = useState(15);

  const maxVotes = Math.max(...serverState.candidates.map(c => (serverState.votes[c] || []).length), 0);

  const getCandidateStyle = (voteCount: number) => {
    if (voteCount === 0) return { backgroundColor: '#f8fafc', color: '#334155' }; // slate-50
    // If there's at least 1 vote, start the intensity at a minimum of 0.2
    const baseIntensity = 0.2;
    const intensity = maxVotes > 0 ? baseIntensity + ((voteCount / maxVotes) * (1 - baseIntensity)) : 0;
    const lightness = 95 - (intensity * 40); // 95% to 55%
    const textColor = lightness < 70 ? '#ffffff' : '#1e1b4b';
    return {
      backgroundColor: `hsl(226, 76%, ${lightness}%)`,
      color: textColor,
      transition: 'background-color 0.3s ease, color 0.3s ease'
    };
  };

  useEffect(() => {
    socket.on('vote:state', (state: ServerState) => {
      setServerState(state);
    });
    socket.on('vote:rooms', (rooms: RoomInfo[]) => {
      setRoomsList(rooms);
    });
    socket.on('vote:closed', () => {
      setRole('none');
      setSelectedRoomId(null);
      setServerState(s => ({...s, state: 'idle'}));
    });

    socket.emit('request:rooms');

    return () => {
      socket.off('vote:state');
      socket.off('vote:rooms');
      socket.off('vote:closed');
    };
  }, []);

  const handleHostOpen = () => {
    if (newRoomName.trim()) {
      socket.emit('host:open', newRoomName.trim());
      setRole('host');
    }
  };

  const handlePlayerJoin = () => {
    if (playerName.trim() && selectedRoomId) {
      socket.emit('player:join', selectedRoomId, playerName);
      setRole('player');
    }
  };

  const handleHostStart = () => {
    const allNames = namesList.length > 0 ? namesList : Object.keys(allData);
    socket.emit('host:start', serverState.roomId, allNames, voteDuration);
  };

  const handleVote = (candidate: string) => {
    socket.emit('player:vote', serverState.roomId, candidate);
  };

  const handleHostClose = () => {
    socket.emit('host:close', serverState.roomId);
    setRole('none');
  };

  const renderRoleSelection = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">Mode Vote</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Join Room */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-600 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6" /> Rejoindre un salon
          </h3>
          
          {!selectedRoomId ? (
            <div className="space-y-3">
              {roomsList.length === 0 ? (
                <p className="text-slate-500 italic">Aucun salon disponible.</p>
              ) : (
                roomsList.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{room.name}</div>
                      <div className="text-sm text-slate-500">{room.state === 'waiting' ? 'En attente' : 'En cours'} • {room.playerCount} joueur(s)</div>
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">
                      Rejoindre
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-600 font-medium">Salon : <span className="font-bold text-slate-800">{roomsList.find(r => r.id === selectedRoomId)?.name}</span></p>
                <button onClick={() => setSelectedRoomId(null)} className="text-sm text-slate-400 hover:text-slate-600">Changer</button>
              </div>
              <input 
                type="text" 
                placeholder="Ton prénom..." 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={handlePlayerJoin}
                disabled={!playerName.trim()}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" /> Entrer
              </button>
            </div>
          )}
        </div>

        {/* Create Room */}
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
          <h3 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
            <Play className="w-6 h-6" /> Créer un salon (Hôte)
          </h3>
          <p className="text-indigo-600/80 mb-4 text-sm">Ouvre un salon pour que les autres puissent te rejoindre.</p>
          <input 
            type="text" 
            placeholder="Nom du salon (ex: Classe 3A)..." 
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="w-full p-3 border border-indigo-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          />
          <button 
            onClick={handleHostOpen}
            disabled={!newRoomName.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" /> Ouvrir le salon
          </button>
        </div>
      </div>

      <button onClick={onBack} className="text-slate-500 hover:text-slate-700 underline flex items-center justify-center gap-1 mx-auto mt-8">
        <ArrowLeft className="w-4 h-4" /> Retour au tirage
      </button>
    </motion.div>
  );

  const renderHostView = () => (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-indigo-700">Tableau de bord (Hôte)</h2>
          <p className="text-slate-500 font-medium mt-1">Salon : <span className="text-indigo-600 font-bold">{serverState.roomName}</span></p>
        </div>
        <button onClick={handleHostClose} className="text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-lg font-medium transition-colors">
          Fermer le salon
        </button>
      </div>

      {serverState.state === 'waiting' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-2xl font-bold mb-2">En attente des joueurs...</h3>
          <p className="text-slate-500 mb-8">Demandez aux participants de rejoindre le vote.</p>
          
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <AnimatePresence>
              {serverState.players.map(p => (
                <motion.div key={p.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                  <Users className="w-4 h-4" /> {p.name}
                </motion.div>
              ))}
            </AnimatePresence>
            {serverState.players.length === 0 && <span className="text-slate-400 italic">Personne n'est encore là</span>}
          </div>

          <div className="mb-8">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Temps de vote</p>
            <div className="flex justify-center gap-4">
              {[15, 20, 30].map(t => (
                <button
                  key={t}
                  onClick={() => setVoteDuration(t)}
                  className={`px-6 py-2 rounded-xl font-bold transition-colors ${voteDuration === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {t} sec
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleHostStart}
            disabled={serverState.players.length === 0}
            className="py-4 px-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xl font-bold rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Lancer le vote ({voteDuration}s)
          </button>
        </motion.div>
      )}

      {serverState.state === 'voting' && (
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-4xl font-black text-rose-500 mb-4 flex items-center justify-center gap-3">
            <Clock className="w-10 h-10 animate-pulse" /> {serverState.timeLeft}s
          </h3>
          <p className="text-xl text-slate-600 mb-2">Les joueurs sont en train de voter...</p>
          <p className="text-md font-bold text-indigo-500 mb-8">{serverState.totalVotes} / {serverState.players.length} votes</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {serverState.candidates.map(c => {
              const voters = serverState.votes[c] || [];
              const style = getCandidateStyle(voters.length);
              const isHot = voters.length >= 4;
              const hotProps = isHot ? {
                animate: { 
                  boxShadow: ['0px 0px 10px rgba(251,191,36,0.4)', '0px 0px 25px rgba(251,191,36,0.8)', '0px 0px 10px rgba(251,191,36,0.4)'],
                  scale: [1, 1.03, 1]
                },
                transition: { repeat: Infinity, duration: 1.5 }
              } : {};

              return (
                <motion.div key={c} style={style} {...hotProps} className={`p-4 rounded-xl border relative shadow-sm ${isHot ? 'border-amber-400 z-10' : 'border-transparent'}`}>
                  {isHot && <Sparkles className="absolute -top-3 -right-3 text-amber-400 w-8 h-8 animate-spin-slow" />}
                  <div className="font-bold text-lg">{c}</div>
                  <div className="text-3xl font-black mt-2 opacity-90">{voters.length}</div>
                  
                  {voters.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-4 pt-3 border-t border-black/10">
                      {voters.map((voterName, i) => {
                        const vEntry = (allData as Record<string, any>)[voterName];
                        let vImg = typeof vEntry === 'object' ? vEntry.image : (typeof vEntry === 'string' ? vEntry : null);
                        if (Array.isArray(vImg)) vImg = vImg.length > 0 ? vImg[0] : null;
                        return vImg ? (
                          <img key={i} src={vImg} alt={voterName} title={voterName} className="w-6 h-6 rounded-full border border-white/50 shadow-sm object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div key={i} title={voterName} className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-bold border border-white/50 shadow-sm">
                            {voterName.charAt(0)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {serverState.state === 'results' && (
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-3xl font-black text-emerald-500 mb-8 flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8" /> Résultats du Vote
          </h3>
          
          <div className="space-y-3 max-w-xl mx-auto">
            {serverState.candidates
              .sort((a, b) => (serverState.votes[b]?.length || 0) - (serverState.votes[a]?.length || 0))
              .map((c, idx) => {
                const voters = serverState.votes[c] || [];
                return (
                  <div key={c} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-xl ${idx === 0 ? 'text-amber-500' : 'text-slate-400'}`}>#{idx + 1}</span>
                      <span className="font-bold text-lg">{c}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {voters.length > 0 && (
                        <div className="flex -space-x-2">
                          {voters.map((voterName, i) => {
                            const vEntry = (allData as Record<string, any>)[voterName];
                            let vImg = typeof vEntry === 'object' ? vEntry.image : (typeof vEntry === 'string' ? vEntry : null);
                            if (Array.isArray(vImg)) vImg = vImg.length > 0 ? vImg[0] : null;
                            return vImg ? (
                              <img key={i} src={vImg} alt={voterName} title={voterName} className="w-8 h-8 rounded-full border-2 border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div key={i} title={voterName} className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                {voterName.charAt(0)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="font-black text-2xl text-indigo-600 min-w-[3rem] text-right">
                        {voters.length} <span className="text-sm text-slate-400 font-normal">votes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <button 
            onClick={() => socket.emit('host:open')}
            className="mt-8 py-3 px-6 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl transition-colors"
          >
            Nouveau Vote
          </button>
        </div>
      )}
    </div>
  );

  const renderPlayerView = () => (
    <div className="max-w-2xl mx-auto text-center">
      {serverState.state === 'waiting' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Tu es dans le salon !</h3>
          <p className="text-slate-500 font-medium mb-1">Salon : <span className="text-emerald-600 font-bold">{serverState.roomName}</span></p>
          <p className="text-slate-500 mb-6">Prépare-toi, le vote va bientôt commencer...</p>
          
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Joueurs présents ({serverState.players.length})</p>
            <div className="flex flex-wrap justify-center gap-2">
              {serverState.players.map(p => {
                const pEntry = (allData as Record<string, any>)[p.name];
                let pImg = typeof pEntry === 'object' ? pEntry.image : (typeof pEntry === 'string' ? pEntry : null);
                if (Array.isArray(pImg)) pImg = pImg.length > 0 ? pImg[0] : null;
                return (
                  <div key={p.id} className="bg-white border border-slate-200 text-slate-700 pr-3 pl-1 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                    {pImg ? (
                      <img src={pImg} alt={p.name} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    {p.name}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </motion.div>
      )}

      {serverState.state === 'voting' && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">À toi de voter !</h3>
            <div className="text-2xl font-black text-rose-500 flex items-center gap-2">
              <Clock className="w-6 h-6" /> {serverState.timeLeft}s
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {serverState.candidates.map(c => {
              const entry = (allData as Record<string, any>)[c];
              let img = typeof entry === 'object' ? entry.image : (typeof entry === 'string' ? entry : null);
              if (Array.isArray(img)) {
                img = img.length > 0 ? img[0] : null;
              }
              const isMyVote = serverState.votes[c]?.includes(playerName);
              const voters = serverState.votes[c] || [];
              const style = getCandidateStyle(voters.length);
              const isHot = voters.length >= 4;
              const hotProps = isHot ? {
                animate: { 
                  boxShadow: ['0px 0px 10px rgba(251,191,36,0.4)', '0px 0px 25px rgba(251,191,36,0.8)', '0px 0px 10px rgba(251,191,36,0.4)'],
                  scale: [1, 1.03, 1]
                },
                transition: { repeat: Infinity, duration: 1.5 }
              } : {};
              
              return (
                <motion.button
                  key={c}
                  onClick={() => handleVote(c)}
                  style={style}
                  {...hotProps}
                  className={`flex flex-col items-center p-4 border-2 rounded-2xl transition-all transform hover:scale-105 ${
                    isMyVote 
                      ? 'border-indigo-500 shadow-md ring-2 ring-indigo-400 ring-offset-2' 
                      : isHot ? 'border-amber-400' : 'border-transparent hover:border-indigo-300 shadow-sm'
                  } ${isHot ? 'z-10' : ''}`}
                >
                  {isHot && <Sparkles className="absolute -top-3 -right-3 text-amber-400 w-8 h-8 animate-spin-slow" />}
                  {img ? (
                    <img src={img} alt={c} className={`w-16 h-16 rounded-full object-cover mb-3 border-2 shadow-sm ${isMyVote ? 'border-indigo-500' : 'border-white/50'}`} referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3 shadow-sm ${isMyVote ? 'bg-indigo-500 text-white' : 'bg-black/10 text-current'}`}>
                      {c.charAt(0)}
                    </div>
                  )}
                  <span className="font-bold mb-2">{c}</span>

                  {voters.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-auto pt-3 border-t border-black/10 w-full">
                      {voters.map((voterName, i) => {
                        const vEntry = (allData as Record<string, any>)[voterName];
                        let vImg = typeof vEntry === 'object' ? vEntry.image : (typeof vEntry === 'string' ? vEntry : null);
                        if (Array.isArray(vImg)) vImg = vImg.length > 0 ? vImg[0] : null;
                        return vImg ? (
                          <img key={i} src={vImg} alt={voterName} title={voterName} className="w-6 h-6 rounded-full border border-white/50 shadow-sm object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div key={i} title={voterName} className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-bold border border-white/50 shadow-sm">
                            {voterName.charAt(0)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {serverState.state === 'results' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-3xl font-black text-emerald-500 mb-2">Vote terminé !</h3>
          <p className="text-slate-500 mb-8">Regarde l'écran de l'hôte pour voir les résultats.</p>
          <div className="w-24 h-24 mx-auto opacity-50">
            <Trophy className="w-full h-full text-amber-400" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {role === 'none' && renderRoleSelection()}
      {role === 'host' && renderHostView()}
      {role === 'player' && renderPlayerView()}
    </div>
  );
}
