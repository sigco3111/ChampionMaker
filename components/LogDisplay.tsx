
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogDisplayProps {
  logs: LogEntry[];
}

const LogDisplay: React.FC<LogDisplayProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
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
      case 'camp':
        return 'text-purple-400'; // Style for training camp logs
      case 'info':
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="h-64 md:h-80 bg-slate-800 p-4 rounded-lg shadow-lg overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
      <h3 className="text-lg font-semibold text-sky-400 mb-2 border-b border-slate-700 pb-1">게임 로그</h3>
      {logs.length === 0 ? (
        <p className="text-slate-400 italic">아직 활동 기록이 없습니다.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {logs.map((log) => (
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