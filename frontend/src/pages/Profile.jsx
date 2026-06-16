import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, ShieldAlert, Award, Star, Settings, Check, Edit2, ShieldCheck, Camera, Upload, X, MapPin } from 'lucide-react';
import axiosInstance from '../utils/axios';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [form, setForm] = useState({
    name: '',
    username: '',
    profilePicture: '',
    bio: '',
    age: '',
    gender: 'Prefer not to say',
    city: '',
    state: '',
    preferredPosition: 'All-rounder',
    skillLevel: 'Intermediate',
    battingStyle: 'Right Hand',
    bowlingStyle: 'Medium'
  });

  // Sync form state when user changes
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        username: user.username || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
        age: user.age || '',
        gender: user.gender || 'Prefer not to say',
        city: user.city || '',
        state: user.state || '',
        preferredPosition: user.preferredPosition || 'All-rounder',
        skillLevel: user.skillLevel || 'Intermediate',
        battingStyle: user.battingStyle || 'Right Hand',
        bowlingStyle: user.bowlingStyle || 'Medium'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please upload JPG, PNG, or WEBP images.');
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    setError('');
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError('');
    setMessage('');
    
    if (user) {
      setForm({
        name: user.name || '',
        username: user.username || '',
        profilePicture: user.profilePicture || '',
        bio: user.bio || '',
        age: user.age || '',
        gender: user.gender || 'Prefer not to say',
        city: user.city || '',
        state: user.state || '',
        preferredPosition: user.preferredPosition || 'All-rounder',
        skillLevel: user.skillLevel || 'Intermediate',
        battingStyle: user.battingStyle || 'Right Hand',
        bowlingStyle: user.bowlingStyle || 'Medium'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    let uploadedPath = form.profilePicture;

    if (selectedFile) {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      try {
        const uploadRes = await axiosInstance.post('/profile/upload-avatar', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        uploadedPath = uploadRes.data.profilePicture;
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to upload profile picture.');
        setLoading(false);
        return;
      }
    }

    const res = await updateProfile({
      ...form,
      profilePicture: uploadedPath,
      age: form.age ? parseInt(form.age) : undefined
    });
    setLoading(false);

    if (res.success) {
      setMessage('Profile updated successfully!');
      setEditMode(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } else {
      setError(res.message);
    }
  };

  const statCards = [
    { label: 'Matches Played', value: user?.statistics?.matchesPlayed || 0, color: 'text-white' },
    { label: 'Wins', value: user?.statistics?.wins || 0, color: 'text-emerald-450' },
    { label: 'Runs Scored', value: user?.statistics?.runs || 0, color: 'text-white' },
    { label: 'Wickets Taken', value: user?.statistics?.wickets || 0, color: 'text-white' },
    { label: 'Batting Avg', value: user?.statistics?.average || 0, color: 'text-white' },
    { label: 'Strike Rate', value: user?.statistics?.strikeRate || 0, color: 'text-white' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      {/* Messages */}
      {error && (
        <div className="p-3.5 bg-slate-900 border border-slate-800 text-red-400 text-xs rounded-xl flex items-center gap-2.5 shadow-sm">
          <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="p-3.5 bg-slate-900 border border-slate-800 text-emerald-450 text-xs rounded-xl flex items-center gap-2.5 shadow-sm">
          <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column - User details summary */}
        <div className="md:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 text-center space-y-5 shadow-lg relative">
            
            {/* Avatar Section with Upload Overlay */}
            <div className="relative w-32 h-32 mx-auto group">
              <img
                src={previewUrl || user?.profilePicture}
                alt={user?.name}
                className="w-full h-full rounded-full border border-slate-800 object-cover shadow-sm transition-all group-hover:brightness-75"
              />
              
              {editMode && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-950/60 rounded-full flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-slate-700"
                >
                  <Camera className="w-6 h-6 text-white mb-0.5" />
                  <span className="text-[9px] font-black tracking-widest text-slate-300 uppercase">Change</span>
                </div>
              )}
              
              <span className="absolute bottom-0 right-0 bg-white border border-slate-800 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black font-mono shadow-sm">
                {user?.statistics?.rating?.toFixed(1) || '5.0'} ★
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />

            <div className="space-y-1">
              <h2 className="font-outfit text-lg font-black text-white tracking-tight uppercase leading-snug">{user?.name}</h2>
              <p className="text-xs text-slate-500 font-bold font-mono">@{user?.username}</p>
              {user?.city && (
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {user.city}, {user.state}
                </p>
              )}
            </div>

            {user?.bio ? (
              <p className="text-xs text-slate-405 leading-relaxed italic bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                &quot;{user.bio}&quot;
              </p>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed italic bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                &quot;No bio written yet. Cap or host, let people know your story...&quot;
              </p>
            )}

            <div className="pt-4 border-t border-slate-850/80 flex justify-between text-left text-[10px] uppercase font-black font-mono text-slate-500">
              <div>
                <p className="text-[8px] tracking-widest">Preferred Position</p>
                <p className="font-bold text-slate-350 mt-1.5 normal-case font-sans text-xs">{user?.preferredPosition}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] tracking-widest">Skill Class</p>
                <p className="font-bold text-slate-355 mt-1.5 normal-case font-sans text-xs">{user?.skillLevel}</p>
              </div>
            </div>

            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 font-black tracking-widest uppercase py-3 px-4 rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-450 shrink-0" /> Edit Settings
              </button>
            )}
          </div>

          {/* Quality Indicator Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-850 space-y-4 shadow-sm">
            <h3 className="font-outfit font-black text-xs uppercase tracking-widest text-slate-400">Indicators</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-450">Attendance Rate</span>
                  <span className="font-bold text-white font-mono">
                    {user?.statistics?.attendancePercentage || 100}%
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${user?.statistics?.attendancePercentage || 100}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 font-bold">
                <span className="text-slate-455">Total Ratings</span>
                <span className="font-bold text-white font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 text-[10px]">
                  {user?.statistics?.ratingsCount || 0} reviews
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Stats Scorecard or Edit Form */}
        <div className="md:col-span-2">
          {editMode ? (
            // Edit Details Form - Redesigned cleanly
            <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-850 space-y-6 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                <h3 className="font-outfit text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-emerald-450 shrink-0" /> EDIT PROFILE DETAILS
                </h3>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {selectedFile && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-slate-450">
                      <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ready: ({ (selectedFile.size / 1024).toFixed(1) } KB)</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedFile(null);
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(null);
                        }
                      }}
                      className="text-slate-500 hover:text-red-450"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Username</label>
                    <input
                      type="text"
                      name="username"
                      required
                      value={form.username}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs font-mono"
                    />
                  </div>

                  {/* Bio */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Biography</label>
                    <textarea
                      name="bio"
                      rows={2}
                      value={form.bio}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs resize-none"
                    />
                  </div>

                  {/* Age */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Age</label>
                    <input
                      type="number"
                      name="age"
                      value={form.age}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs font-mono"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Gender</label>
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">City</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">State</label>
                    <input
                      type="text"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs"
                    />
                  </div>

                  {/* Preferred Position */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Preferred Position</label>
                    <select
                      name="preferredPosition"
                      value={form.preferredPosition}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs cursor-pointer"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-rounder">All-rounder</option>
                      <option value="Wicket Keeper">Wicket Keeper</option>
                      <option value="Captain">Captain</option>
                    </select>
                  </div>

                  {/* Skill Level */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Skill Level</label>
                    <select
                      name="skillLevel"
                      value={form.skillLevel}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs cursor-pointer"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>

                  {/* Batting Style */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Batting Hand</label>
                    <select
                      name="battingStyle"
                      value={form.battingStyle}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs cursor-pointer"
                    >
                      <option value="Right Hand">Right Hand</option>
                      <option value="Left Hand">Left Hand</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  {/* Bowling Style */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Bowling Delivery</label>
                    <select
                      name="bowlingStyle"
                      value={form.bowlingStyle}
                      onChange={handleChange}
                      className="w-full bg-slate-955 border border-slate-800 hover:border-slate-700 focus:border-slate-600 text-slate-200 px-3.5 py-2.5 rounded-xl outline-none text-xs cursor-pointer"
                    >
                      <option value="Fast">Fast</option>
                      <option value="Medium">Medium</option>
                      <option value="Spin">Spin</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white hover:bg-slate-200 text-slate-950 font-black text-xs py-4 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-widest shadow"
                  >
                    {loading ? 'Processing...' : 'Save Profile Settings'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Statistics Scorecard - Redesigned to be stark and clean
            <div className="space-y-6">
              
              {/* Cricket stats */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-5 shadow-sm">
                <h3 className="font-outfit text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Trophy className="w-4.5 h-4.5 text-slate-400 shrink-0" /> CAREER SCORECARD
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {statCards.map((card, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1 text-left shadow-inner">
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black font-mono">{card.label}</p>
                      <p className={`text-xl font-black font-mono ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Style Preferences */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-850 space-y-5 shadow-sm">
                <h3 className="font-outfit text-sm font-black uppercase tracking-widest text-white flex items-center gap-2 border-b border-slate-850 pb-3">
                  <Award className="w-4.5 h-4.5 text-slate-400 shrink-0" /> SPORTING CONFIGURATION
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-1 text-left shadow-inner">
                    <span className="text-slate-550 block uppercase tracking-widest font-black text-[9px] font-mono">Batting Hand</span>
                    <span className="font-extrabold text-slate-200 text-xs">{user?.battingStyle} Bat</span>
                  </div>
                  <div className="p-4 bg-slate-955 rounded-xl border border-slate-850 space-y-1 text-left shadow-inner">
                    <span className="text-slate-550 block uppercase tracking-widest font-black text-[9px] font-mono">Bowling Type</span>
                    <span className="font-extrabold text-slate-200 text-xs">{user?.bowlingStyle} Delivery</span>
                  </div>
                  <div className="p-4 bg-slate-955 rounded-xl border border-slate-850 space-y-1 text-left shadow-inner">
                    <span className="text-slate-550 block uppercase tracking-widest font-black text-[9px] font-mono">Position</span>
                    <span className="font-extrabold text-slate-200 text-xs">{user?.preferredPosition}</span>
                  </div>
                  <div className="p-4 bg-slate-955 rounded-xl border border-slate-850 space-y-1 text-left shadow-inner">
                    <span className="text-slate-550 block uppercase tracking-widest font-black text-[9px] font-mono">Skill Bracket</span>
                    <span className="font-extrabold text-slate-200 text-xs">{user?.skillLevel} Tier</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
