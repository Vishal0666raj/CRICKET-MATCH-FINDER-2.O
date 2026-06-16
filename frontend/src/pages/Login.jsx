import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Mail,
  Lock,
  ShieldCheck,
  Globe,
  Loader2,
  ArrowRight
} from "lucide-react";
import { motion } from 'framer-motion';

const Login = () => {
  const { sendOtp, verifyOtp, loginWithOAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devOtp, setDevOtp] = useState(''); // helper to show OTP in dev console card

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setMessage('');
    
    const res = await sendOtp(email);
    setLoading(false);

    if (res.success) {
      setOtpSent(true);
      setMessage(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
    } else {
      setError(res.message);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.substring(value.length - 1);
    setOtpDigits(newDigits);

    // Auto-focus next field
    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    const res = await verifyOtp(email, otp);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    setError('');

    // Simulated Social Credentials (Mock for local development convenience)
    // We send payload to standard /auth/oauth
    const mockPayloads = {
      google: {
        provider: 'google',
        id: `g_mock_${Math.floor(100000 + Math.random() * 900000)}`,
        email: `${provider}_player@cricketfinder.com`,
        name: `${provider.toUpperCase()} Cricket User`,
        profilePicture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200'
      },
      github: {
        provider: 'github',
        id: `gh_mock_${Math.floor(100000 + Math.random() * 900000)}`,
        email: `${provider}_player@cricketfinder.com`,
        name: `${provider.toUpperCase()} HardHitter`,
        profilePicture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
      }
    };

    const res = await loginWithOAuth(mockPayloads[provider]);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  // Helper to auto-fill the dev OTP
  const handleAutoFillDevOtp = () => {
    if (devOtp) {
      const digits = devOtp.split('');
      setOtpDigits(digits);
      otpRefs[5].current.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 select-none relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative border border-slate-800"
      >
        {/* Title / Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="font-outfit text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
            CricFinder
          </h1>
          <p className="text-sm text-slate-400">Discover and Organize Local Matches</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center">
            {message}
          </div>
        )}

        {/* Development Helper Card */}
        {otpSent && devOtp && (
          <div className="mb-6 p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Dev Helper
              </span>
              <span className="text-[10px] text-slate-500">Auto-generated local code</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              We logged this OTP to the terminal console, but you can also click below to auto-fill.
            </p>
            <button
              onClick={handleAutoFillDevOtp}
              className="text-xs font-mono font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors shadow-inner"
            >
              Fill code: <span className="bg-slate-950/20 px-1.5 rounded">{devOtp}</span>
            </button>
          </div>
        )}

        {!otpSent ? (
          // Email submission form
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 text-slate-200 pl-11 pr-4 py-3 rounded-xl outline-none transition-all placeholder-slate-600 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-slate-950 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Get OTP Code <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          // OTP verification form
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2.5 block text-center">
                Enter the 6-digit OTP code sent to your email
              </label>
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 bg-slate-900 border border-slate-800 focus:border-emerald-500 text-center text-slate-200 text-xl font-bold rounded-xl outline-none transition-colors"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:scale-100 disabled:opacity-50 text-slate-950 font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Log In'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtpDigits(['', '', '', '', '', '']);
                setDevOtp('');
                setError('');
                setMessage('');
              }}
              className="text-xs font-medium text-slate-400 hover:text-white block mx-auto transition-colors"
            >
              Change email / request new OTP
            </button>
          </form>
        )}

        {/* Social logins */}
        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block mb-4">
            Or continue with
          </span>
          <div className="flex gap-4">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800/40 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Globe className="w-4 h-4 text-red-400" /> Google
            </button>
            <button
              onClick={() => handleSocialLogin('github')}
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800/40 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Globe className="w-4 h-4 text-purple-400" />GitHub
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
