import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.png';

const Navbar = ({ toggleSidebar, toggleCollapse, isCollapsed }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="navbar print:hidden shadow-lg">
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

        <button onClick={logout} className="btn btn-primary !py-2 !px-4 !text-[11px] shadow-lg shadow-orange-900/20">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
