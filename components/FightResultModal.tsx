
import React from 'react';
import ActionButton from './ActionButton';

interface FightResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: "승리" | "패배" | "";
  title: string;
  details: string[];
  rewards?: string;
}

const FightResultModal: React.FC<FightResultModalProps> = ({ isOpen, onClose, result, title, details, rewards }) => {
  if (!isOpen) return null;

  const resultColor = result === "승리" ? "text-green-400" : "text-red-400";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <h2 className={`text-3xl font-bold mb-4 text-center ${resultColor}`}>{title}</h2>
        <div className="text-center mb-1">
            <p className={`text-5xl font-extrabold ${resultColor}`}>{result}</p>
        </div>
        <div className="max-h-60 overflow-y-auto mb-4 p-2 bg-slate-700 rounded scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
          {details.map((line, index) => (
            <p key={index} className="text-slate-300 text-sm mb-1">{line}</p>
          ))}
        </div>
        {rewards && <p className="text-yellow-400 font-semibold mb-6 text-center">{rewards}</p>}
        <ActionButton onClick={onClose} className="w-full bg-sky-600 hover:bg-sky-700">
          확인
        </ActionButton>
      </div>
    </div>
  );
};

export default FightResultModal;
