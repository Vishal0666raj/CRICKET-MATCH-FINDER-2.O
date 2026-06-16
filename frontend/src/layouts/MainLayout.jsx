import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../utils/axios';
import { Bell, LogOut, Trophy, Compass, Plus, User, Shield, Menu, X, Check } from 'lucide-react';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch Notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await axiosInstance.get('/notifications');
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30000 // fallback polling if socket drops
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Mark single read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await axiosInstance.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.put('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Find Matches', path: '/', icon: Compass },
    { name: 'Create Match', path: '/matches/create', icon: Plus },
    { name: 'Profile', path: '/profile', icon: User }
  ];

  if (user?.role === 'admin') {
    navLinks.push({ name: 'Admin Panel', path: '/admin', icon: Shield });
  }

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification._id);
    }
    setShowNotifications(false);
    if (notification.matchId) {
      navigate(`/matches/${notification.matchId._id || notification.matchId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <Trophy className="w-7 h-7 text-emerald-500 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-outfit text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              CricFinder
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-400 py-1.5 px-3 rounded-lg ${
                    isActive 
                      ? 'bg-slate-800/80 text-emerald-400 border border-slate-700' 
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* User Operations */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 flex flex-col">
                  <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <span className="font-outfit font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="flex-1 divide-y divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 text-left hover:bg-slate-800/60 cursor-pointer transition-colors ${
                            !n.isRead ? 'bg-slate-800/20' : ''
                          }`}
                        >
                          <p className="text-xs text-slate-200 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Icon / Avatar */}
            <div className="hidden sm:flex items-center gap-3 pl-2 border-l border-slate-800">
              <img
                src={user?.profilePicture}
                alt={user?.name}
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-slate-200 line-clamp-1">{user?.name}</p>
                <p className="text-[10px] text-slate-500">@{user?.username}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-800 flex flex-col gap-2 animate-fadeIn">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 text-sm font-medium py-2 px-3 rounded-lg ${
                    isActive 
                      ? 'bg-slate-800/80 text-emerald-400 border border-slate-700' 
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CricFinder. Built for local cricket organizers and players.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Terms</span>
            <span className="hover:text-slate-400 cursor-pointer">Privacy</span>
            <span className="hover:text-slate-400 cursor-pointer">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
