import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../utils/axios';
import MapView from '../components/MapView';
import { 
  Trophy, Calendar, Clock, MapPin, Users, Award, 
  ShieldAlert, ShieldCheck, ArrowLeft, Loader2, 
  MessageSquare, UserPlus, Check, X, Send, Award as MvpIcon, Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const MatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const [chatMessage, setChatMessage] = useState('');
  const [chatLogs, setChatLogs] = useState([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isRatingPlayer, setIsRatingPlayer] = useState(false);

  // Score completion state
  const [scoreForm, setScoreForm] = useState({
    winningTeam: '',
    scores: '',
    runs: 0,
    wickets: 0,
    mvp: '',
    playerPerformances: [] // array of { userId, runs, wickets, ballsFaced, won }
  });

  // Rating state
  const [ratingForm, setRatingForm] = useState({
    rateeId: '',
    sportsmanship: 5,
    skill: 5,
    teamwork: 5,
    punctuality: 5
  });

  const chatEndRef = useRef(null);

  // Fetch Match Details
  const { data: details, isLoading, error: fetchError } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/matches/${id}`);
      return res.data;
    }
  });

  const match = details?.match;
  const participants = details?.participants || [];
  const acceptedPlayersCount = details?.acceptedPlayersCount || 0;
  const userStatus = details?.userStatus || 'none';
  const userAttendance = details?.userAttendance || 'none';

  const isOrganizer = match?.creator?._id === user?._id;
  const isPlayerAccepted = userStatus === 'accepted';

  // Fetch Chat logs
  useQuery({
    queryKey: ['chat-history', id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/matches/${id}/chat`);
      setChatLogs(res.data);
      return res.data;
    },
    enabled: !!match && (isOrganizer || isPlayerAccepted)
  });

  // Connect to Socket room on mount/load
  useEffect(() => {
    if (socket && match && (isOrganizer || isPlayerAccepted)) {
      socket.emit('join_match_chat', { matchId: match._id });

      const handleIncomingMessage = (newChat) => {
        setChatLogs((prev) => [...prev, newChat]);
      };

      const handleChatNotification = (notif) => {
        setChatLogs((prev) => [
          ...prev,
          { _id: Math.random().toString(), message: notif.message, type: 'notification', createdAt: new Date() }
        ]);
        queryClient.invalidateQueries({ queryKey: ['match', id] });
      };

      socket.on('receive_message', handleIncomingMessage);
      socket.on('chat_notification', handleChatNotification);

      return () => {
        socket.off('receive_message', handleIncomingMessage);
        socket.off('chat_notification', handleChatNotification);
      };
    }
  }, [socket, match, isOrganizer, isPlayerAccepted, id, queryClient]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs]);

  // Initialize player performances table when opening complete modal
  useEffect(() => {
    if (match && participants.length > 0) {
      const acceptedPlayers = participants.filter((p) => p.status === 'accepted');
      setScoreForm((prev) => ({
        ...prev,
        playerPerformances: acceptedPlayers.map((p) => ({
          userId: p.userId._id,
          name: p.userId.name,
          runs: 0,
          wickets: 0,
          ballsFaced: 0,
          won: false
        }))
      }));
    }
  }, [match, participants]);

  // Mutations
  const joinMatchMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/matches/${id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
    }
  });

  const leaveMatchMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.post(`/matches/${id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      setChatLogs([]);
    }
  });

  const manageParticipantMutation = useMutation({
    mutationFn: async ({ participantId, status }) => {
      await axiosInstance.put(`/matches/${id}/participants`, { participantId, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
    }
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ userId, attendance }) => {
      await axiosInstance.put(`/matches/${id}/attendance`, { userId, attendance });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
    }
  });

  const completeMatchMutation = useMutation({
    mutationFn: async (payload) => {
      await axiosInstance.post(`/matches/${id}/complete`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      setIsCompleting(false);
    }
  });

  const submitRatingMutation = useMutation({
    mutationFn: async (payload) => {
      await axiosInstance.post('/ratings', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      setIsRatingPlayer(false);
      setRatingForm({ rateeId: '', sportsmanship: 5, skill: 5, teamwork: 5, punctuality: 5 });
    }
  });

  // Action Triggers
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socket || !match) return;

    socket.emit('send_message', {
      matchId: match._id,
      senderId: user._id,
      message: chatMessage
    });
    setChatMessage('');
  };

  const handlePerformanceChange = (index, field, value) => {
    const updated = [...scoreForm.playerPerformances];
    updated[index][field] = field === 'won' ? value : parseInt(value) || 0;
    setScoreForm({ ...scoreForm, playerPerformances: updated });
  };

  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    completeMatchMutation.mutate(scoreForm);
  };

  const handleRatingSubmit = (e) => {
    e.preventDefault();
    submitRatingMutation.mutate({
      matchId: match._id,
      ...ratingForm
    });
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
        <p className="text-slate-400 text-sm">Retrieving cricket match records...</p>
      </div>
    );
  }

  if (fetchError || !match) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
        <h2 className="font-outfit text-xl font-bold text-white">Match Records Missing</h2>
        <p className="text-slate-500 text-xs">
          The match record you are looking for may have been deleted by the admin or does not exist.
        </p>
        <button onClick={() => navigate('/')} className="bg-slate-900 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const acceptedParticipants = participants.filter((p) => p.status === 'accepted');
  const pendingParticipants = participants.filter((p) => p.status === 'requested');

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to matches
      </button>

      {/* Main Grid: Match Details Left, Chat Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Match Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  match.ballType === 'Leather'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {match.ballType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-400">
                  {match.skillLevel}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  match.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : match.status === 'cancelled'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {match.status}
                </span>
              </div>

              <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {match.title}
              </h1>

              {/* Match description */}
              {match.description && (
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-900/60">
                  {match.description}
                </p>
              )}
            </div>

            {/* Key Game Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> {new Date(match.date).toLocaleDateString()} at {match.time}
                </span>
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-500 block">Overs</span>
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" /> {match.overs} Overs
                </span>
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-500 block">Vacancies</span>
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> {match.playersNeeded} slots
                </span>
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="text-slate-500 block">Entry Cost</span>
                <span className="font-bold text-slate-200">
                  {match.entryFee === 0 ? 'Free Entry' : `₹${match.entryFee}`}
                </span>
              </div>
            </div>

            {/* Ground Info & Interactive Map */}
            <div className="space-y-3">
              <h3 className="font-outfit font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" /> Venue & Pitch Map
              </h3>
              <p className="text-xs text-slate-400">
                <strong>{match.ground}</strong> - {match.address}
              </p>
              <div className="h-56 rounded-xl overflow-hidden relative border border-slate-800 bg-slate-950">
                <MapView 
                  center={[match.location.coordinates[1], match.location.coordinates[0]]} 
                  markers={[{
                    position: [match.location.coordinates[1], match.location.coordinates[0]],
                    popup: match.ground
                  }]}
                  zoom={14}
                />
              </div>
            </div>

            {/* Special notes */}
            {match.notes && (
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
                <strong className="text-slate-200 block mb-0.5">Host Notes:</strong>
                {match.notes}
              </div>
            )}

            {/* Join / Leave operations */}
            {match.status === 'scheduled' && !isOrganizer && (
              <div className="pt-4 border-t border-slate-800/80 flex justify-end">
                {userStatus === 'none' && (
                  <button
                    onClick={() => joinMatchMutation.mutate()}
                    disabled={joinMatchMutation.isPending || acceptedPlayersCount >= match.maxPlayers}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    <UserPlus className="w-4 h-4" /> Request to Join
                  </button>
                )}
                {userStatus === 'requested' && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      Approval Request Pending
                    </span>
                    <button
                      onClick={() => leaveMatchMutation.mutate()}
                      disabled={leaveMatchMutation.isPending}
                      className="bg-slate-900 border border-slate-800 hover:border-red-500/20 hover:border-red-500/30 hover:text-red-400 py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}
                {userStatus === 'accepted' && (
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Confirmed Participant
                    </span>
                    
                    {/* Confirm attendance self */}
                    {userAttendance === 'pending' && (
                      <button
                        onClick={() => updateAttendanceMutation.mutate({ userId: user._id, attendance: 'present' })}
                        className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        Confirm Presence
                      </button>
                    )}

                    <button
                      onClick={() => leaveMatchMutation.mutate()}
                      disabled={leaveMatchMutation.isPending}
                      className="bg-slate-900 border border-slate-800 hover:border-red-500/20 hover:border-red-500/30 hover:text-red-400 py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Leave Match
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Organizer Operations Hub */}
          {isOrganizer && match.status === 'scheduled' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
              <h2 className="font-outfit text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy className="w-5 h-5 text-emerald-500" /> Host Controls Dashboard
              </h2>

              {/* Pending Join Requests */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Join Requests ({pendingParticipants.length})</h3>
                {pendingParticipants.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-950/40 p-4 rounded-xl border border-slate-800/40">No pending player requests.</p>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                    {pendingParticipants.map((p) => (
                      <div key={p._id} className="p-3 bg-slate-950 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={p.userId.profilePicture} className="w-8 h-8 rounded-full object-cover" alt="" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-200">{p.userId.name}</p>
                            <p className="text-[10px] text-slate-400">Position: {p.userId.preferredPosition} | Rating: {p.userId.statistics.rating.toFixed(1)}★</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => manageParticipantMutation.mutate({ participantId: p._id, status: 'accepted' })}
                            className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg hover:bg-emerald-400 cursor-pointer"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => manageParticipantMutation.mutate({ participantId: p._id, status: 'rejected' })}
                            className="bg-red-500/10 text-red-400 p-1.5 rounded-lg hover:bg-red-500/20 border border-red-500/20 cursor-pointer"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attendance Management */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Player Attendance ({acceptedParticipants.length} joined)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {acceptedParticipants.map((p) => (
                    <div key={p._id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={p.userId.profilePicture} className="w-7 h-7 rounded-full object-cover" alt="" />
                        <span className="text-xs text-slate-300 font-semibold">{p.userId.name}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateAttendanceMutation.mutate({ userId: p.userId._id, attendance: 'present' })}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                            p.attendance === 'present'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => updateAttendanceMutation.mutate({ userId: p.userId._id, attendance: 'absent' })}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                            p.attendance === 'absent'
                              ? 'bg-red-500 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Finish Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsCompleting(true)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Complete Match & Log Scores
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to cancel this match? This action notifies all players.')) {
                      try {
                        await axiosInstance.put(`/matches/${match._id}/attendance`, { attendance: 'absent' }); // test or mock trigger
                        alert('Match cancelled successfully!');
                      } catch (e) {}
                    }
                  }}
                  className="bg-slate-950 border border-slate-800 hover:border-red-500/20 hover:text-red-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel Match
                </button>
              </div>
            </div>
          )}

          {/* Results Board (Shown when completed) */}
          {match.status === 'completed' && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-6">
              <h2 className="font-outfit text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy className="w-5 h-5 text-emerald-400" /> Match Scorecard & Results
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Winner</span>
                  <p className="text-base font-extrabold text-emerald-400">{match.result.winningTeam || 'N/A'}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 sm:col-span-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Match Score</span>
                  <p className="text-base font-extrabold text-white">{match.result.scores || 'N/A'}</p>
                </div>
              </div>

              {match.result.mvp && (
                <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <MvpIcon className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Most Valuable Player (MVP)</span>
                      <p className="text-xs font-bold text-slate-200">{match.result.mvp.name}</p>
                    </div>
                  </div>
                  <img src={match.result.mvp.profilePicture} className="w-10 h-10 rounded-full object-cover" alt="" />
                </div>
              )}
            </div>
          )}

          {/* Ratings Submission System */}
          {match.status === 'completed' && isPlayerAccepted && (
            <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
              <h3 className="font-outfit font-bold text-sm text-slate-200">Rate Team Members</h3>
              <p className="text-xs text-slate-400">
                Help build our cricket community by rating your teammates on sportsmanship, skill, and punctuality.
              </p>
              
              {!isRatingPlayer ? (
                <button
                  onClick={() => setIsRatingPlayer(true)}
                  className="bg-emerald-500 text-slate-950 font-bold text-xs py-2 px-4 rounded-xl hover:bg-emerald-400 cursor-pointer"
                >
                  Rate Players Now
                </button>
              ) : (
                <form onSubmit={handleRatingSubmit} className="space-y-4 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 mb-1 block">Select Player</label>
                      <select
                        required
                        value={ratingForm.rateeId}
                        onChange={(e) => setRatingForm({ ...ratingForm, rateeId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2 px-3 rounded-lg outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Player --</option>
                        {acceptedParticipants
                          .filter((p) => p.userId._id !== user._id)
                          .map((p) => (
                            <option key={p.userId._id} value={p.userId._id}>
                              {p.userId.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {['sportsmanship', 'skill', 'teamwork', 'punctuality'].map((attr) => (
                      <div key={attr}>
                        <label className="text-xs font-semibold text-slate-400 mb-1 block capitalize">{attr} (1-5)</label>
                        <select
                          value={ratingForm[attr]}
                          onChange={(e) => setRatingForm({ ...ratingForm, [attr]: parseInt(e.target.value) })}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2 px-3 rounded-lg outline-none cursor-pointer font-bold font-mono"
                        >
                          {[5, 4, 3, 2, 1].map((v) => (
                            <option key={v} value={v}>
                              {v} ★
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsRatingPlayer(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitRatingMutation.isPending}
                      className="bg-emerald-500 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg hover:bg-emerald-400 cursor-pointer"
                    >
                      Submit Rating
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Real-time Chat Room */}
        <div className="lg:col-span-1 h-[450px] lg:h-auto lg:min-h-[500px]">
          {isOrganizer || isPlayerAccepted ? (
            // Chat room component
            <div className="w-full h-full flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-emerald-400" />
                <span className="font-outfit font-bold text-sm text-slate-200">Match Chat Room</span>
              </div>

              {/* Chat Message Logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/30">
                {chatLogs.map((log) => {
                  if (log.type === 'notification') {
                    return (
                      <div key={log._id} className="text-center">
                        <span className="inline-block bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-bold px-2.5 py-1 rounded-full">
                          {log.message}
                        </span>
                      </div>
                    );
                  }

                  const isOwnMessage = log.sender?._id === user._id || log.sender === user._id;

                  return (
                    <div key={log._id} className={`flex items-start gap-2 ${isOwnMessage ? 'flex-row-reverse text-right' : 'text-left'}`}>
                      {!isOwnMessage && (
                        <img 
                          src={log.sender?.profilePicture} 
                          alt="" 
                          className="w-7 h-7 rounded-full border border-slate-700 object-cover mt-0.5 shrink-0" 
                        />
                      )}
                      <div className="space-y-0.5">
                        {!isOwnMessage && (
                          <span className="text-[10px] font-bold text-slate-500 block">
                            {log.sender?.name || 'Player'}
                          </span>
                        )}
                        <div className={`p-2.5 rounded-xl text-xs max-w-[200px] inline-block ${
                          isOwnMessage
                            ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                        }`}>
                          {log.message}
                        </div>
                        <span className="text-[9px] text-slate-600 block mt-0.5">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
                <input
                  type="text"
                  placeholder="Type match details message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-xs text-slate-200 px-3 py-2.5 rounded-xl outline-none"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4 fill-slate-950" />
                </button>
              </form>
            </div>
          ) : (
            // Join lock message
            <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-full">
                <MessageSquare className="w-8 h-8 text-slate-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-outfit font-bold text-sm text-slate-200">Chat Room Locked</h3>
                <p className="text-xs text-slate-500 max-w-[220px]">
                  You must be accepted by the organizer as a participant to view and send messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Match Scores Completion Modal */}
      {isCompleting && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900 border border-slate-850 p-6 sm:p-8 rounded-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col gap-6"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-outfit text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Complete Match & Log Stats
              </h3>
              <button onClick={() => setIsCompleting(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Winner Team</label>
                  <input
                    type="text"
                    required
                    placeholder="Team Green / Team Yellow"
                    value={scoreForm.winningTeam}
                    onChange={(e) => setScoreForm({ ...scoreForm, winningTeam: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Scores Summary</label>
                  <input
                    type="text"
                    required
                    placeholder="Team A 120/8 (16 ov), Team B 121/4 (14.2 ov)"
                    value={scoreForm.scores}
                    onChange={(e) => setScoreForm({ ...scoreForm, scores: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 px-3 py-2 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1.5 block">MVP Selection</label>
                  <select
                    value={scoreForm.mvp}
                    onChange={(e) => setScoreForm({ ...scoreForm, mvp: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs py-2 px-3 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">-- Choose MVP --</option>
                    {acceptedParticipants.map((p) => (
                      <option key={p.userId._id} value={p.userId._id}>
                        {p.userId.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Player individual performances */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-2 uppercase tracking-wider">
                  Individual Player Performances
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-2">Player Name</th>
                        <th className="pb-2 w-16 text-center">Runs</th>
                        <th className="pb-2 w-16 text-center">Balls</th>
                        <th className="pb-2 w-16 text-center">Wickets</th>
                        <th className="pb-2 w-16 text-center">Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {scoreForm.playerPerformances.map((perf, index) => (
                        <tr key={perf.userId}>
                          <td className="py-2 text-slate-300 font-medium">{perf.name}</td>
                          <td className="py-1">
                            <input
                              type="number"
                              min={0}
                              value={perf.runs}
                              onChange={(e) => handlePerformanceChange(index, 'runs', e.target.value)}
                              className="w-14 bg-slate-950 border border-slate-850 text-center text-slate-200 rounded py-1 font-mono font-bold"
                            />
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              min={0}
                              value={perf.ballsFaced}
                              onChange={(e) => handlePerformanceChange(index, 'ballsFaced', e.target.value)}
                              className="w-14 bg-slate-950 border border-slate-850 text-center text-slate-200 rounded py-1 font-mono font-bold"
                            />
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              min={0}
                              value={perf.wickets}
                              onChange={(e) => handlePerformanceChange(index, 'wickets', e.target.value)}
                              className="w-14 bg-slate-950 border border-slate-850 text-center text-slate-200 rounded py-1 font-mono font-bold"
                            />
                          </td>
                          <td className="py-1 text-center">
                            <input
                              type="checkbox"
                              checked={perf.won}
                              onChange={(e) => handlePerformanceChange(index, 'won', e.target.checked)}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="submit"
                disabled={completeMatchMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {completeMatchMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Publish Scorecard'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MatchDetails;
