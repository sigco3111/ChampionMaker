
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogDisplayProps {
  logs: LogEntry[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      // Scroll to bottom (which is now oldest if logs are reversed for display)
      // Or scroll to top if you want newest to be immediately visible after new log.
      // For reversed display, scrolling to top means showing the newest.
      logContainerRef.current.scrollTop = 0; 
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'fight':
        return 'text-yellow-400';
      case 'finance':
        return 'text-blue-400';
      case 'news':
        return 'text-cyan-400';
      // case 'camp': // REMOVED
      //   return 'text-purple-400'; 
      case 'info':
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div 
      ref={logContainerRef} 
      className="h-64 md:h-80 bg-slate-800 p-4 rounded-lg shadow-lg overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
      aria-live="polite" // Announce changes to screen readers
    >
      <h3 className="text-lg font-semibold text-sky-400 mb-2 border-b border-slate-700 pb-1 sticky top-0 bg-slate-800 z-10">게임 로그</h3>
      {logs.length === 0 ? (
        <p className="text-slate-400 italic">아직 활동 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {logs.slice().reverse().map((log) => (
            <li key={log.id} className={`${getLogColor(log.type)}`}>
              <span className="font-medium">[Week {log.week}]</span> {log.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LogDisplay;
