import React, { useEffect, useState } from 'react';

const IntroAnimation = ({ onComplete }) => {
  const [stage, setStage] = useState('drawing'); // drawing -> complete -> fadeout

  useEffect(() => {
    // Slower, elegant, majestic cinematic sequence:
    // Stage 1 (0s - 4.8s): Logo image fades, zooms and sheens in with cinematic motion-blur.
    // Stage 2 (4.8s - 6.2s): Finished, shining logo holds beautifully on screen.
    // Stage 3 (6.2s - 7.2s): Extra-smooth fadeout transition to reveal RRR Engine.

    const completeTimer = setTimeout(() => {
      setStage('complete');
    }, 4800);

    const fadeoutTimer = setTimeout(() => {
      setStage('fadeout');
    }, 6200);

    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 7200);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(fadeoutTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white transition-all duration-[1200ms] ease-in-out ${stage === 'fadeout' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
        }`}
    >
      {/* Light cyber-grid accent background lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.08] pointer-events-none"></div>

      {/* Soft spotlight behind the official logo image */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-[#38bdf8]/8 rounded-full blur-[120px] pointer-events-none transition-all duration-[1800ms] ${stage === 'complete' ? 'scale-125 opacity-100 bg-[#0b72b8]/12' : 'scale-100 opacity-60'
        }`}></div>

      <div className="flex flex-col items-center justify-center z-10 w-full max-w-xl px-8">

        {/* Core Official Logo Image Container */}
        <div className="relative w-full max-w-md aspect-[3.2/1] flex items-center justify-center overflow-hidden rounded-3xl p-6">

          {/* Animated transparent official logo image */}
          <img
            src="/cfi-logo.png"
            alt="CFI India Network"
            className="w-full h-auto object-contain select-none animate-logo-reveal"
            style={{
              animationDuration: '3.6s',
              animationTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
              animationFillMode: 'forwards',
            }}
          />

          {/* Premium diagonal sheen sweep overlay */}
          <div
            className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] animate-sheen-sweep pointer-events-none"
            style={{
              animationDelay: '1.4s',
              animationDuration: '2.2s',
              animationFillMode: 'forwards',
            }}
          />

          {/* Glowing India Target Locator pin overlayed precisely on the Globe graphic */}
          <div
            className={`absolute top-[40%] right-[19.5%] z-20 pointer-events-none transition-all duration-[1500ms] ${stage === 'drawing' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
              }`}
            style={{
              transitionDelay: '2.4s'
            }}
          >
            {/* Double ping forensic locator rings */}
            <span className="absolute inline-flex h-6 w-6 rounded-full bg-[#009fe3]/30 -translate-x-1/2 -translate-y-1/2 animate-ping" style={{ animationDuration: '2.4s' }}></span>
            <span className="absolute inline-flex h-4 w-4 rounded-full bg-[#009fe3]/50 -translate-x-1/2 -translate-y-1/2 animate-ping" style={{ animationDuration: '1.6s' }}></span>
            {/* Core target dot */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009fe3] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_#009fe3]"></span>
          </div>

          {/* Particle blast dispersion on completion */}
          {stage === 'complete' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#38bdf8] animate-particle"
                  style={{
                    '--rot': `${i * 30}deg`,
                    transform: `rotate(${i * 30}deg) translateY(-40px)`,
                    animationDelay: '0s',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Minimal synchronized progress bar */}
        <div className="w-36 h-[2px] bg-slate-100 rounded-full overflow-hidden mt-6 relative">
          <div
            className={`absolute top-0 left-0 h-full bg-[#0a3966] transition-all duration-[4800ms] ease-out ${stage === 'drawing' ? 'w-0' : 'w-full'
              }`}
          ></div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 select-none">
          <span className="w-1 h-1 rounded-full bg-[#0a3966] animate-ping"></span>
          <span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-slate-400">
            Loading...
          </span>
        </div>

      </div>

      {/* Custom styled vector keyframes for motion effects */}
      <style jsx="true">{`
        @keyframes logoReveal {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
            filter: blur(10px) contrast(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0px) contrast(1);
          }
        }

        @keyframes sheenSweep {
          0% { transform: translateX(-150%) skewX(-25deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(250%) skewX(-25deg); opacity: 0; }
        }

        @keyframes particleOut {
          0% { transform: rotate(var(--rot)) translateY(0px) scale(1); opacity: 1; }
          100% { transform: rotate(var(--rot)) translateY(70px) scale(0); opacity: 0; }
        }

        .animate-logo-reveal {
          animation: logoReveal 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-sheen-sweep {
          animation: sheenSweep 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-particle {
          --rot: 0deg;
          animation: particleOut 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default IntroAnimation;
