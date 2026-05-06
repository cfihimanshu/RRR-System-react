import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { Menu, Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import logo from '../assets/logo.png';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Navbar = ({ toggleSidebar, toggleCollapse, isCollapsed }) => {
  const { user, logout } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const lastNotifiedRef = useRef(null); // Keep track of the last notification ID toasted

  const fetchNotifications = async (isInitial = false) => {
    try {
      const res = await api.get('/notifications');
      const newNotifications = res.data;
      
      // Check for new unread notifications to show toast
      if (!isInitial && newNotifications.length > 0) {
        const latestUnread = newNotifications.find(n => !n.isRead);
        if (latestUnread && latestUnread._id !== lastNotifiedRef.current) {
          toast((t) => (
            <div className="flex flex-col gap-1 cursor-pointer" onClick={() => {
              toast.dismiss(t.id);
              navigate(latestUnread.link || '/');
            }}>
              <p className="text-[11px] font-black uppercase tracking-widest text-accent">New Notification</p>
              <p className="text-xs font-bold text-white line-clamp-1">{latestUnread.title}</p>
              <p className="text-[10px] text-gray-400 line-clamp-2">{latestUnread.message}</p>
            </div>
          ), {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#0f172a',
              border: '1px solid #334155',
              padding: '12px',
              borderRadius: '16px'
            },
            icon: <Bell size={18} className="text-accent" />
          });
          lastNotifiedRef.current = latestUnread._id;
        }
      } else if (isInitial && newNotifications.length > 0) {
        // Just set the initial ref to the latest notification ID
        const latest = newNotifications[0];
        lastNotifiedRef.current = latest._id;
      }

      setNotifications(newNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications(true);
      const interval = setInterval(() => fetchNotifications(false), 30000); // Polling every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="navbar print:hidden shadow-lg relative">
      {/* Mobile Toggle */}
      <button className="md:hidden flex items-center justify-center min-w-[40px] px-2 py-1.5 border border-gray-800/70 rounded hover:bg-gray-700/20 transition-colors" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>

      {/* Desktop Collapse Toggle */}
      <button
        className="hidden md:flex items-center justify-center min-w-[40px] h-10 w-10 hover:bg-white/5 rounded-lg transition-colors"
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <Menu size={22} className="text-gray-400 hover:text-white" />
      </button>

      <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={toggleCollapse}>
        <img src={logo} alt="RRR Engine Logo" className="h-10 md:h-11 w-auto object-contain" />
      </div>

      <div className="ml-auto flex items-center gap-4 text-sm">
        <div className="clock hidden sm:flex items-center bg-gray-900/50 px-4 py-1.5 rounded-full">
          {format(new Date(), 'dd MMM yyyy, hh:mm a')}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900/30 hidden md:flex">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-gray-300 font-medium">
            {user?.fullName && <b className="text-white mr-1.5">{user.fullName}</b>}
            <span className="text-[10px] opacity-60 uppercase tracking-wider">{user?.role}</span>
          </span>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 bg-gray-900/40 hover:bg-gray-900/60 rounded-xl border border-white/5 transition-all relative group"
          >
            <Bell size={18} className={`transition-colors ${unreadCount > 0 ? 'text-accent animate-swing' : 'text-gray-400 group-hover:text-white'}`} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-secondary animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl">
              <div className="p-4 border-b border-border flex items-center justify-between bg-bg-secondary/50">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1">
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-muted italic text-[11px]">No notifications yet</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n._id} 
                      className={`p-4 border-b border-border/50 hover:bg-white/5 transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-accent-soft/10' : ''}`}
                      onClick={() => {
                        if (!n.isRead) markAsRead(n._id);
                        if (n.link) {
                          navigate(n.link);
                          setShowNotifications(false);
                        }
                      }}
                    >
                      {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />}
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <span className="text-[11px] font-black text-text-primary uppercase tracking-tight">{n.title}</span>
                        <span className="text-[9px] text-text-muted whitespace-nowrap">{format(new Date(n.createdAt), 'hh:mm a')}</span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 mb-2">{n.message}</p>
                      {n.link && (
                        <div className="text-[9px] font-bold text-accent uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Details <ExternalLink size={10} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={logout} className="btn btn-primary !py-2 !px-4 !text-[11px] shadow-lg shadow-orange-900/20">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
