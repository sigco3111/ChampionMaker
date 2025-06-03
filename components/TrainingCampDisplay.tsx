
import React from 'react';
import { TrainingCamp, PlayerStats, STAT_NAMES_KOREAN } from '../types';
import ActionButton from './ActionButton';

interface TrainingCampDisplayProps {
  availableCamps: TrainingCamp[];
  activeCamp: TrainingCamp | null;
  weeksRemaining: number;
  onStartCamp: (campId: string) => void;
  playerFunds: number;
  playerReputation: number;
  playerStats: PlayerStats; 
  isPlayerBusy?: boolean; 
}

const TrainingCampDisplay: React.FC<TrainingCampDisplayProps> = ({
  availableCamps,
  activeCamp,
  weeksRemaining,
  onStartCamp,
  playerFunds,
  playerReputation,
  playerStats,
  isPlayerBusy = false,
}) => {
  if (activeCamp) {
    return null; 
  }

  return (
    <section className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-sky-400 mb-3 border-b border-slate-700 pb-2">특별 훈련 캠프</h2>
      <p className="text-xs text-slate-400 mb-3">집중 훈련을 통해 능력치를 크게 향상시키거나 특별한 특성을 얻으세요. 캠프 기간 동안에는 다른 활동(일반 훈련, 경기)이 불가능합니다.</p>
      {availableCamps.length === 0 && <p className="text-sm text-slate-400 italic">현재 이용 가능한 특별 훈련 캠프가 없습니다.</p>}
      
      <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {availableCamps.map(camp => {
          const canAfford = playerFunds >= camp.cost;
          const meetsReputation = camp.reputationRequired ? playerReputation >= camp.reputationRequired : true;
          // isPlayerBusy already accounts for activeCamp (via App.tsx logic) and auto-pilot
          const isDisabledByCampLogic = !canAfford || !meetsReputation; 
          const finalIsDisabled = isPlayerBusy || isDisabledByCampLogic;
          
          let disabledReason = "";
          if (isPlayerBusy && !activeCamp) disabledReason = "자동 진행 중이거나 다른 활동 중";
          else if (!canAfford) disabledReason = `비용 부족 ($${camp.cost} 필요)`;
          else if (!meetsReputation) disabledReason = `평판 부족 (${camp.reputationRequired} 필요)`;

          return (
            <div key={camp.id} className={`p-3 rounded-md ${finalIsDisabled ? 'bg-slate-700 opacity-60' : 'bg-slate-700 hover:bg-slate-600/70'}`}>
              <h4 className="font-bold text-base text-sky-300">{camp.name}</h4>
              <p className="text-xs text-slate-300 mb-1">{camp.description}</p>
              <p className="text-xs">비용: <span className={canAfford ? "text-green-400" : "text-red-400"}>${camp.cost}</span></p>
              <p className="text-xs">기간: <span className="text-yellow-400">{camp.durationWeeks}주</span></p>
              {camp.reputationRequired && (
                <p className="text-xs">
                  요구 평판: <span className={meetsReputation ? "text-green-400" : "text-red-400"}>{camp.reputationRequired}</span>
                </p>
              )}
              <p className="text-xs">효과:
                {camp.effects.map(eff => ` ${STAT_NAMES_KOREAN[eff.stat] || eff.stat} +${eff.value}`).join(', ')}
                {camp.traitAwarded && <span className="text-purple-400">, 특성 획득: {camp.traitAwarded}</span>}
              </p>
              <ActionButton
                onClick={() => onStartCamp(camp.id)}
                disabled={finalIsDisabled}
                className="w-full mt-2 text-sm py-1.5"
                title={finalIsDisabled ? (disabledReason || "참가 불가") : `캠프 시작: ${camp.name}`}
              >
                {finalIsDisabled ? (disabledReason || "참가 불가") : "캠프 시작"}
              </ActionButton>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default TrainingCampDisplay;