import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../utils/axios';
import { Shield, Users, Trophy, Flag, Ban, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';

const AdminPanel = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Fetch Dashboard Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/dashboard');
      return res.data;
    }
  });

  // Fetch Users
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/users');
      return res.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch Reports
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/reports');
      return res.data;
    },
    enabled: activeTab === 'reports'
  });

  // Mutations
  const banMutation = useMutation({
    mutationFn: async (userId) => {
      await axiosInstance.put(`/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId) => {
      await axiosInstance.put(`/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (reportId) => {
      await axiosInstance.put(`/admin/reports/${reportId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    }
  });

  return (
    <div className="space-y-6 text-left">
      <div className="space-y-1">
        <h1 className="font-outfit text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-emerald-500" /> Admin Command Center
        </h1>
        <p className="text-sm text-slate-400">
          Monitor platforms telemetry, manage registered player status, and moderate flagged activities.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {['dashboard', 'users', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Users Stats */}
              <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Players</span>
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-white">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-slate-400">
                    Active: <span className="text-emerald-400 font-bold">{stats?.users?.active || 0}</span> | Banned: <span className="text-red-400 font-bold">{stats?.users?.banned || 0}</span>
                  </p>
                </div>
              </div>

              {/* Matches Stats */}
              <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matches</span>
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-white">{stats?.matches?.total || 0}</p>
                  <p className="text-xs text-slate-400">
                    Scheduled: <span className="text-amber-500 font-bold">{stats?.matches?.scheduled || 0}</span> | Completed: <span className="text-blue-400 font-bold">{stats?.matches?.completed || 0}</span>
                  </p>
                </div>
              </div>

              {/* Reports Stats */}
              <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abuse Reports</span>
                  <Flag className="w-5 h-5 text-red-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-extrabold text-white">{stats?.reports?.total || 0}</p>
                  <p className="text-xs text-slate-400">
                    Pending moderation: <span className="text-red-400 font-bold">{stats?.reports?.pending || 0}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h3 className="font-outfit font-bold text-base text-white">Registered Player Directory</h3>
          
          {usersLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-850 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Player Info</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Position</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-900/35 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={u.profilePicture} className="w-8 h-8 rounded-full object-cover border border-slate-800" alt="" />
                          <div>
                            <p className="font-bold text-slate-200">{u.name}</p>
                            <p className="text-[10px] text-slate-500">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300 font-mono">{u.email}</td>
                      <td className="p-3 text-slate-400">{u.preferredPosition}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'banned'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== 'admin' && (
                          u.status === 'active' ? (
                            <button
                              onClick={() => banMutation.mutate(u._id)}
                              disabled={banMutation.isPending}
                              className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" /> Ban User
                            </button>
                          ) : (
                            <button
                              onClick={() => unbanMutation.mutate(u._id)}
                              disabled={unbanMutation.isPending}
                              className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Unban User
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h3 className="font-outfit font-bold text-base text-white">Flagged Abuse Logs</h3>
          
          {reportsLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-6 text-center">No reports filed yet.</p>
          ) : (
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {reports.map((r) => (
                <div key={r._id} className="p-4 bg-slate-950/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5 text-xs text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Filed by:</span>
                      <strong className="text-slate-300">@{r.reporter?.username}</strong>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400 animate-pulse'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    
                    <p className="text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-850 max-w-lg">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider mb-0.5">Reason</span>
                      {r.reason}
                    </p>

                    <div className="flex gap-4 text-[10px] text-slate-500">
                      {r.targetUser && (
                        <span>Target Player: <strong className="text-slate-400">@{r.targetUser.username}</strong></span>
                      )}
                      {r.targetMatch && (
                        <span>Target Match: <strong className="text-slate-400">#{r.targetMatch.title}</strong></span>
                      )}
                    </div>
                  </div>

                  {r.status === 'pending' && (
                    <button
                      onClick={() => resolveReportMutation.mutate(r._id)}
                      disabled={resolveReportMutation.isPending}
                      className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
