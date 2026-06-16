import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../utils/axios';
import MapPicker from '../components/MapPicker';
import { Calendar, Clock, Trophy, MapPin, DollarSign, Users, Award, ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

const CreateMatch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    ground: '',
    address: '',
    date: '',
    time: '',
    overs: 16,
    playersNeeded: 11,
    skillLevel: 'All',
    ballType: 'Tennis',
    entryFee: 0,
    maxPlayers: 22,
    notes: '',
    isPrivate: false
  });

  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState('');

  // Radius for searching nearby grounds
  const [radius, setRadius] = useState(15);
  const [nearbyGrounds, setNearbyGrounds] = useState([]);

  // Auto-detect user position to center map
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocating(false);
        },
        (err) => {
          console.log('CreateMatch: Geolocation failed. Using fallbacks...', err.message);
          const profileCoords = user?.lookingForMatchConfig?.location?.coordinates;
          if (profileCoords && profileCoords[0] !== 0 && profileCoords[1] !== 0) {
            setCoords({
              lat: profileCoords[1],
              lng: profileCoords[0]
            });
          } else {
            setCoords({ lat: 12.9716, lng: 77.5946 });
          }
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      const profileCoords = user?.lookingForMatchConfig?.location?.coordinates;
      if (profileCoords && profileCoords[0] !== 0 && profileCoords[1] !== 0) {
        setCoords({
          lat: profileCoords[1],
          lng: profileCoords[0]
        });
      } else {
        setCoords({ lat: 12.9716, lng: 77.5946 });
      }
      setLocating(false);
    }
  }, [user]);

  // Fetch unique grounds inside search radius from prior matches
  useEffect(() => {
    const fetchNearbyGrounds = async () => {
      if (!coords) return;
      try {
        const res = await axiosInstance.get('/matches', {
          params: {
            longitude: coords.lng,
            latitude: coords.lat,
            distance: radius
          }
        });
        
        const grounds = [];
        const seen = new Set();
        res.data.forEach((m) => {
          if (m.ground && m.location?.coordinates && !seen.has(m.ground)) {
            seen.add(m.ground);
            grounds.push({
              name: m.ground,
              address: m.address || '',
              lat: m.location.coordinates[1],
              lng: m.location.coordinates[0]
            });
          }
        });
        setNearbyGrounds(grounds);
      } catch (err) {
        console.log('Error fetching grounds list:', err);
      }
    };
    fetchNearbyGrounds();
  }, [coords, radius]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectGround = (ground) => {
    setForm((prev) => ({
      ...prev,
      ground: ground.name,
      address: ground.address
    }));
  };

  const handleCoordsChange = (newCoords) => {
    setCoords(newCoords);
    if (!form.address) {
      setForm((prev) => ({
        ...prev,
        address: prev.ground ? `${prev.ground}` : 'Selected ground location'
      }));
    }
  };

  const createMatchMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.post('/matches', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      navigate(`/matches/${data._id}`);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to host match.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!coords) {
      setError('Please pinpoint the match ground on the map below.');
      return;
    }

    const payload = {
      ...form,
      longitude: coords.lng,
      latitude: coords.lat
    };

    createMatchMutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 text-left">
        <div className="space-y-1.5">
          <h1 className="font-outfit text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-emerald-500" /> Host a Match
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fill in the match settings, set target skill configurations, select the ball type, and pinpoint coordinates.
          </p>
        </div>

        {locating && (
          <div className="p-3 bg-slate-950 border border-slate-850 text-slate-450 text-xs rounded-xl flex items-center gap-2">
            <Loader2 className="w-4.5 h-4.5 animate-spin text-emerald-500 shrink-0" />
            <span>Locating your current coordinates...</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Match Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Weekend Friendly Leather Ball T20"
                value={form.title}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs transition-colors"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Match Details</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Provide directions, entry criteria, equipment details..."
                value={form.description}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs resize-none transition-colors"
              />
            </div>

            {/* Ground Name */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Ground Name</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                <input
                  type="text"
                  name="ground"
                  required
                  placeholder="e.g. Kanteerava Cricket Stadium"
                  value={form.ground}
                  onChange={handleChange}
                  className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 pl-10 pr-4 py-3 rounded-xl outline-none text-xs transition-colors"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Landmark / Street Address</label>
              <input
                type="text"
                name="address"
                required
                placeholder="e.g. Kasturba Road, Sampangi Rama Nagar, Bangalore"
                value={form.address}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs transition-colors"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Match Date</label>
              <input
                type="date"
                name="date"
                required
                value={form.date}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs transition-colors"
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Start Time</label>
              <input
                type="time"
                name="time"
                required
                value={form.time}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs transition-colors"
              />
            </div>

            {/* Overs */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Overs</label>
              <input
                type="number"
                name="overs"
                required
                min={1}
                value={form.overs}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs font-mono transition-colors"
              />
            </div>

            {/* Max Squad */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Squad Limit</label>
              <input
                type="number"
                name="maxPlayers"
                required
                min={2}
                value={form.maxPlayers}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs font-mono transition-colors"
              />
            </div>

            {/* Players Needed */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Spots Needed</label>
              <input
                type="number"
                name="playersNeeded"
                required
                min={0}
                value={form.playersNeeded}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs font-mono transition-colors"
              />
            </div>

            {/* Entry Fee */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Entry Fee (₹)</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  name="entryFee"
                  min={0}
                  value={form.entryFee}
                  onChange={handleChange}
                  className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 pl-10 pr-4 py-3 rounded-xl outline-none text-xs font-mono font-bold transition-colors"
                />
              </div>
            </div>

            {/* Ball Type */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Ball Type</label>
              <select
                name="ballType"
                value={form.ballType}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs cursor-pointer transition-colors"
              >
                <option value="Tennis">Tennis</option>
                <option value="Leather">Leather</option>
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider">Target Skill</label>
              <select
                name="skillLevel"
                value={form.skillLevel}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs cursor-pointer transition-colors"
              >
                <option value="All">All Skill Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
              </select>
            </div>

            {/* Private Match Checkbox */}
            <div className="sm:col-span-2 flex items-center gap-3 bg-slate-950 p-4 border border-slate-850 rounded-xl shadow-inner">
              <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={form.isPrivate}
                onChange={handleChange}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="isPrivate" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                Make match private (accessible only via unique link ID)
              </label>
            </div>

            {/* Radius Grounds Selection Widget & Map Picker */}
            <div className="sm:col-span-2 space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 border border-slate-850 rounded-xl shadow-inner">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-200 block">Ground Search Settings</label>
                  <p className="text-[10px] text-slate-550 leading-relaxed">
                    Set a search radius to display previously hosted grounds as green markers. Click a green marker to choose it.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-500 font-bold font-mono">Radius:</span>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-32 accent-emerald-450 cursor-pointer h-1 bg-slate-850 rounded-lg"
                  />
                  <span className="font-mono text-emerald-400 font-black text-xs">{radius} km</span>
                </div>
              </div>

              {nearbyGrounds.length > 0 && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl space-y-2.5">
                  <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Select from {nearbyGrounds.length} nearby ground{nearbyGrounds.length !== 1 ? 's' : ''}:</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                    {nearbyGrounds.map((g, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setCoords({ lat: g.lat, lng: g.lng });
                          handleSelectGround(g);
                        }}
                        className="bg-slate-900/90 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-emerald-400 border border-slate-850 hover:border-slate-700 px-3 py-2 rounded-lg text-left transition-colors truncate max-w-[220px] shadow"
                        title={`${g.name} - ${g.address}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <MapPicker 
                value={coords} 
                onChange={handleCoordsChange} 
                nearbyGrounds={nearbyGrounds}
                onSelectGround={handleSelectGround}
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wider font-sans">Special Host Instructions</label>
              <textarea
                name="notes"
                rows={2}
                placeholder="e.g. Ground has free parking, washroom facilities, first aid available..."
                value={form.notes}
                onChange={handleChange}
                className="w-full bg-slate-955 border border-slate-800 hover:border-slate-750 focus:border-emerald-500 text-slate-200 px-4 py-3 rounded-xl outline-none text-xs resize-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMatchMutation.isPending || !coords}
            className="w-full bg-white hover:bg-slate-200 text-slate-950 font-black text-xs py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-widest cursor-pointer border border-transparent active:scale-[0.98]"
          >
            {createMatchMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Publish Cricket Match'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateMatch;
