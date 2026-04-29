import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.png';

const Navbar = ({ toggleSidebar, toggleCollapse, isCollapsed }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="print:hidden bg-gradient-to-r from-blue-600 to-blue-800 text-white flex items-center px-5 h-14 gap-4 sticky top-0 z-50 shadow-md">
      {/* Mobile Toggle */}
      <button className="md:hidden flex items-center justify-center min-w-[40px] px-2 py-1.5 border border-white/20 rounded hover:bg-white/10 transition-colors" onClick={toggleSidebar}>
        <Menu size={20} />
      </button>

      {/* Desktop Collapse Toggle */}
      <button 
        className="hidden md:flex items-center justify-center min-w-[40px] h-10 w-10 hover:bg-white/10 rounded-lg transition-colors" 
        onClick={toggleCollapse}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={toggleCollapse}>
        <img src={logo} alt="RRR Engine Logo" className="h-12 md:h-13 w-auto object-contain" />
      </div>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <div className="bg-white/15 px-3 py-1 rounded-full text-xs hidden sm:block">
          {format(new Date(), 'dd MMM yyyy, hh:mm a')}
        </div>
        <span className="opacity-80 hidden md:inline-block">
          {user?.fullName && <b className="mr-2">{user.fullName}</b>}
          ({user?.role})
        </span>
        <button onClick={logout} className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors shadow-sm">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
