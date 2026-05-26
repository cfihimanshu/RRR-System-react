import React from 'react';

const TabLoader = ({ minHeight = "400px", text = "Loading System Metrics" }) => (
  <div className="flex-1 flex flex-col items-center justify-center select-none w-full" style={{ minHeight }}>
    <div className="flex items-center justify-center gap-6 mb-5">
      {['R', 'R', 'R'].map((char, index) => (
        <div key={index} className="relative flex items-center justify-center w-14 h-14">
          {/* Glowing Ripple Circle */}
          <span 
            className="absolute inset-0 rounded-xl bg-accent/5 border border-accent/20 animate-ping opacity-75"
            style={{
              animationDelay: `${index * 0.2}s`,
              animationDuration: '1.4s'
            }}
          />
          {/* The Outer Morphing Square/Circle Box */}
          <div 
            className="absolute inset-0 border-2 border-accent/40 rounded-xl animate-morph-box bg-bg-card shadow-sm"
            style={{
              animationDelay: `${index * 0.2}s`
            }}
          />
          {/* Animated Letter R */}
          <span 
            className="relative text-xl font-black text-accent animate-pulse-letter z-10"
            style={{
              animationDelay: `${index * 0.2}s`
            }}
          >
            {char}
          </span>
        </div>
      ))}
    </div>
    {text && (
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted animate-pulse">
        {text}
      </span>
    )}
  </div>
);

export default TabLoader;
