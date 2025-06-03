
import React from 'react';
import { PlayerStats } from '../types';
import ActionButton from './ActionButton';

interface GameClearScreenProps {
  playerStats: PlayerStats;
  gameWeek: number;
  totalSponsorships: number;
  onRestart: () => void;
}

const GameClearScreen: React.FC<GameClearScreenProps> = ({ playerStats, gameWeek, totalSponsorships, onRestart }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center w-full max-w-lg">
        <h1 className="text-4xl font-bold text-green-400 mb-3">게임 클리어!</h1>
        <h2 className="text-2xl font-semibold text-sky-300 mb-6">"{playerStats.playerName}" 선수는 새로운 전설이 되었습니다!</h2>
        
        <div className="text-left space-y-2 mb-8 bg-slate-700 p-4 rounded-md">
          <p className="text-lg"><strong>최종 기록:</strong></p>
          <ul className="list-disc list-inside pl-4 text-slate-300">
            <li>총 경기 주차: {gameWeek}주</li>
            <li>전적: {playerStats.wins}승 {playerStats.losses}패</li>
            <li>최종 랭크: <span className="font-semibold text-yellow-400">{playerStats.rank}</span></li>
            <li>최종 명성: <span className="font-semibold text-purple-400">{playerStats.reputation}</span></li>
            <li>최종 자금: <span className="font-semibold text-green-400">${playerStats.funds}</span></li>
            {playerStats.traits.length > 0 && (
              <li>획득 특성: <span className="text-cyan-300">{playerStats.traits.join(', ')}</span></li>
            )}
            <li>총 스폰서 계약 수: {totalSponsorships}건</li>
          </ul>
        </div>
        
        <p className="text-slate-300 mb-6">당신의 여정은 여기서 끝났지만, 새로운 도전은 언제나 기다리고 있습니다.</p>
        
        <ActionButton onClick={onRestart} className="w-full bg-sky-600 hover:bg-sky-700 text-lg py-3">
          새로운 여정 시작
        </ActionButton>
      </div>
    </div>
  );
};

export default GameClearScreen;
