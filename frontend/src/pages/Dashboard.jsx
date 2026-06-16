import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../utils/axios';
import MapView from '../components/MapView';
import { Calendar, Clock, Trophy, MapPin, Search, SlidersHorizontal, Map, UserCheck, Play, Loader2, Info, Navigation, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { user, updateLookingForMatch } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [ballType, setBallType] = useState('All');
  const [skillLevel, setSkillLevel] = useState('All');
  const [distance, setDistance] = useState(15);
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore
  const [locationLoaded, setLocationLoaded] = useState(false);
  const [cityName, setCityName] = useState('Detecting Location...');
  const [locationStatus, setLocationStatus] = useState('detecting'); // detecting, resolved, fallback
  const [locationError, setLocationError] = useState(null);

  // Reverse Geocoding helper using public OSM Nominatim API
  const fetchCityName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`
      );
      const data = await response.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.suburb ||
        data.address?.village ||
        data.address?.state ||
        'Current Location';
      setCityName(city);
    } catch (err) {
      console.log('Failed to fetch city name from coords', err);
      setCityName('Current Location');
    }
  };

  // Get user geolocation gracefully
  useEffect(() => {
    if (navigator.geolocation) {
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          setLocationStatus('resolved');
          setLocationLoaded(true);
          fetchCityName(lat, lng);
        },
        (error) => {
          console.log('Browser geolocation failed or declined. Checking fallback...', error.message);
          setLocationError(error.message);
          
          const profileCoords = user?.lookingForMatchConfig?.location?.coordinates;
          if (profileCoords && profileCoords[0] !== 0 && profileCoords[1] !== 0) {
            const lat = profileCoords[1];
            const lng = profileCoords[0];
            setCoords({ lat, lng });
            setLocationStatus('fallback');
            setLocationLoaded(true);
            fetchCityName(lat, lng);
          } else {
            setCoords({ lat: 12.9716, lng: 77.5946 });
            setLocationStatus('fallback');
            setLocationLoaded(true);
            setCityName('Bangalore (Default)');
          }
        },
        geoOptions
      );
    } else {
      const profileCoords = user?.lookingForMatchConfig?.location?.coordinates;
      if (profileCoords && profileCoords[0] !== 0 && profileCoords[1] !== 0) {
        const lat = profileCoords[1];
        const lng = profileCoords[0];
        setCoords({ lat, lng });
        setLocationStatus('fallback');
        setLocationLoaded(true);
        fetchCityName(lat, lng);
      } else {
        setCoords({ lat: 12.9716, lng: 77.5946 });
        setLocationStatus('fallback');
        setLocationLoaded(true);
        setCityName('Bangalore (Default)');
      }
    }
  }, [user]);

  // Fetch Matches using React Query
  const { data: matches = [], isLoading, refetch } = useQuery({
    queryKey: ['matches', searchTerm, ballType, skillLevel, distance, coords, locationLoaded],
    queryFn: async () => {
      if (!locationLoaded) return [];
      const params = {
        query: searchTerm,
        ballType,
        skill: skillLevel,
        longitude: coords.lng,
        latitude: coords.lat,
        distance
      };
      const res = await axiosInstance.get('/matches', { params });
      return res.data;
    },
    enabled: locationLoaded
  });

  // Toggle Looking for Match
  const [lookingState, setLookingState] = useState(user?.isLookingForMatch || false);
  const [lookingRadius, setLookingRadius] = useState(user?.lookingForMatchConfig?.preferredRadius || 10);

  // Update local state when user context changes
  useEffect(() => {
    if (user) {
      setLookingState(user.isLookingForMatch || false);
      setLookingRadius(user.lookingForMatchConfig?.preferredRadius || 10);
    }
  }, [user]);

  const toggleLookingMutation = useMutation({
    mutationFn: async () => {
      return await updateLookingForMatch({
        isLookingForMatch: !lookingState,
        longitude: coords.lng,
        latitude: coords.lat,
        preferredRadius: lookingRadius
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setLookingState(data.user.isLookingForMatch);
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    }
  });

  const handleToggleLooking = () => {
    toggleLookingMutation.mutate();
  };

  // Convert matches into Leaflet map marker positions
  const mapMarkers = matches.map((m) => {
    const mCoords = m.location?.coordinates || [0, 0];
    return {
      position: [mCoords[1], mCoords[0]],
      popup: (
        <div className="p-1 font-sans text-xs">
          <p className="font-bold text-slate-950 text-sm mb-1">{m.title}</p>
          <p className="text-slate-600 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {m.ground}
          </p>
          <p className="text-slate-600 mb-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" /> {new Date(m.date).toLocaleDateString()}
          </p>
          <button
            onClick={() => navigate(`/matches/${m._id}`)}
            className="w-full bg-emerald-500 hover:bg-emerald-650 text-slate-955 font-bold py-1.5 px-2.5 rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
          >
            View Details <Play className="w-2.5 h-2.5 fill-slate-950" />
          </button>
        </div>
      )
    };
  });

  return (
    <div className="space-y-8 text-left">
      {/* Geolocation Status Alert */}
      {locationStatus === 'detecting' && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />
          <span>Syncing match search with your current location coordinates...</span>
        </div>
      )}
      {locationError && locationStatus === 'fallback' && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2 text-slate-450 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
          <span>Location permissions denied. Showing defaults or matching profile city coordinates.</span>
        </div>
      )}

      {/* Available to Play Broadcast Widget - Redesigned to be stark and premium */}
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-850 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative shadow-lg">
        <div className="space-y-2 max-w-2xl">
          <h2 className="font-outfit text-lg font-black tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-5.5 h-5.5 text-emerald-400 shrink-0" /> AVAILABLE FOR MATCHES
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Toggle this mode to notify surrounding captains that you are ready for games. Captains can view your skill bracket, position details, and invite you to games directly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto shrink-0 z-10">
          {lookingState && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-slate-350">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Captains Search:</span>
              <input
                type="range"
                min="2"
                max="50"
                value={lookingRadius}
                onChange={(e) => setLookingRadius(parseInt(e.target.value))}
                className="w-24 accent-white cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
              <span className="font-mono text-white font-extrabold">{lookingRadius}km</span>
            </div>
          )}

          <button
            onClick={handleToggleLooking}
            disabled={toggleLookingMutation.isPending}
            className={`py-3 px-6 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow border ${
              lookingState
                ? 'bg-slate-950 border-slate-800 text-red-400 hover:bg-slate-900/50'
                : 'bg-white hover:bg-slate-200 border-transparent text-slate-950'
            }`}
          >
            {toggleLookingMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : lookingState ? (
              'Stop Broadcast'
            ) : (
              'Broadcast Availability'
            )}
          </button>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column - Matches Directory */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header & City Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
            <div className="flex items-center gap-2">
              <Navigation className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <h2 className="font-outfit text-xl font-black text-white tracking-tight uppercase">
                CRICKET MATCHES NEAR <span className="underline underline-offset-4 decoration-emerald-500/40">{cityName}</span>
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black font-mono">
              {matches.length} Match{matches.length !== 1 ? 'es' : ''} Available
            </p>
          </div>

          {/* Filters Bar - Clean and Professional */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            {/* Search Input */}
            <div className="relative w-full md:w-auto md:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search grounds, teams or creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-650 focus:ring-0 pl-10 pr-4 py-3 rounded-lg outline-none text-xs text-slate-200 placeholder-slate-600 transition-all font-sans"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs shrink-0 transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={ballType}
                  onChange={(e) => setBallType(e.target.value)}
                  className="bg-transparent text-slate-350 outline-none cursor-pointer text-xs"
                >
                  <option value="All" className="bg-slate-950">All Balls</option>
                  <option value="Tennis" className="bg-slate-950">Tennis</option>
                  <option value="Leather" className="bg-slate-950">Leather</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs shrink-0 transition-colors">
                <Trophy className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className="bg-transparent text-slate-355 outline-none cursor-pointer text-xs"
                >
                  <option value="All" className="bg-slate-950">All Skills</option>
                  <option value="Beginner" className="bg-slate-950">Beginner</option>
                  <option value="Intermediate" className="bg-slate-950">Intermediate</option>
                  <option value="Advanced" className="bg-slate-950">Advanced</option>
                  <option value="Professional" className="bg-slate-950">Professional</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs shrink-0 transition-colors">
                <span className="text-slate-550 font-bold uppercase tracking-wider text-[9px] mr-1">Radius:</span>
                <select
                  value={distance}
                  onChange={(e) => setDistance(Number(e.target.value))}
                  className="bg-transparent text-white font-extrabold outline-none cursor-pointer font-mono text-xs"
                >
                  <option value="5" className="bg-slate-950">5 km</option>
                  <option value="10" className="bg-slate-950">10 km</option>
                  <option value="15" className="bg-slate-950">15 km</option>
                  <option value="25" className="bg-slate-950">25 km</option>
                  <option value="50" className="bg-slate-950">50 km</option>
                </select>
              </div>
            </div>
          </div>

          {/* Match Cards List */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 bg-slate-900 border border-slate-850 rounded-2xl animate-pulse h-40" />
              ))
            ) : matches.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-900/10">
                <div className="p-4 bg-slate-900 border border-slate-850 rounded-full text-slate-650 shadow-inner">
                  <Info className="w-6 h-6" />
                </div>
                <p className="text-slate-300 text-sm font-bold">No cricket games matches found</p>
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  Try adjusting the filters, selecting a wider radius, or check back later as hosts post new games.
                </p>
              </div>
            ) : (
              matches.map((match) => {
                const percentFilled = Math.min(100, ((match.acceptedPlayersCount || 0) / (match.maxPlayers || 22)) * 100);
                
                return (
                  <motion.div
                    key={match._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/matches/${match._id}`)}
                    className="p-6 bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-2xl cursor-pointer transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group shadow-sm border-l-4 border-l-slate-700 hover:border-l-emerald-500"
                  >
                    <div className="space-y-3 flex-grow">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          match.ballType === 'Leather'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {match.ballType} Ball
                        </span>
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-950 border border-slate-850 text-slate-400 font-mono">
                          {match.skillLevel}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-outfit text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                        {match.title}
                      </h3>

                      {/* Info Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-500 uppercase font-black font-mono">
                        <span className="flex items-center gap-1.5 normal-case font-sans text-slate-450">
                          <MapPin className="w-3.5 h-3.5 text-slate-650" /> {match.ground}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-650" /> {new Date(match.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-650" /> {match.time}
                        </span>
                      </div>
                    </div>

                    {/* Right column - Squad occupancy & visual progress */}
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 pt-4 md:pt-0 border-t md:border-0 border-slate-850/80 gap-3">
                      <div className="text-left md:text-right">
                        <p className="text-[9px] text-slate-550 uppercase tracking-widest font-black">Entry Fee</p>
                        <p className="text-sm font-black text-white">
                          {match.entryFee === 0 ? 'Free' : `₹${match.entryFee}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-between md:justify-end gap-2 mb-1">
                          <span className="text-[10px] text-slate-450 font-bold block font-mono">
                            {match.acceptedPlayersCount} / {match.maxPlayers} squads
                          </span>
                        </div>
                        {/* Visual progress bar */}
                        <div className="w-28 h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                            style={{ width: `${percentFilled}%` }} 
                          />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 group-hover:underline mt-2 block">
                          {match.hasJoined ? 'Enter Lobby →' : 'Book Spot →'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Geospatial Map View - Fixed laptop size coordinates issue */}
        <div className="lg:col-span-1 h-[350px] lg:h-[600px] sticky top-24 shrink-0">
          <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-slate-850 bg-slate-900 p-4 gap-4 shadow-xl">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-400" />
                <span className="font-outfit font-black text-sm text-slate-200 uppercase tracking-tight">Geospatial Board</span>
              </div>
              <span className="text-[8px] text-slate-450 font-black tracking-widest bg-slate-950 px-2 py-1 rounded border border-slate-850 font-mono">HYBRID SATELLITE</span>
            </div>
            
            <div className="flex-grow rounded-xl overflow-hidden relative">
              {locationLoaded ? (
                <MapView center={[coords.lat, coords.lng]} markers={mapMarkers} />
              ) : (
                <div className="w-full h-full bg-slate-950 flex items-center justify-center border border-slate-850 rounded-xl">
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                    <p className="text-xs text-slate-500 font-mono">Calibrating satellite telemetry...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-[9px] text-slate-500 text-center leading-relaxed">
              * Click anywhere to select custom positions or double click pins for Google Maps navigation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
