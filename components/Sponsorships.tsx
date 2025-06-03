
import React from 'react';
import { Sponsorship, ActiveSponsorship } from '../types';
import ActionButton from './ActionButton';

interface SponsorshipsProps {
  funds: number;
  activeSponsorships: ActiveSponsorship[];
  completedSponsorshipIds: string[];
  availableSponsorships: Sponsorship[];
  onSignSponsorship: (sponsorshipId: string) => void;
  reputation: number;
  isPlayerBusy?: boolean; 
}

const Sponsorships: React.FC<SponsorshipsProps> = ({
  funds,
  activeSponsorships,
  completedSponsorshipIds,
  availableSponsorships,
  onSignSponsorship,
  reputation,
  isPlayerBusy = false,
}) => {
  const MAX_ACTIVE_WEEKLY_CONTRACTS = 2;
  const currentWeeklyActiveCount = activeSponsorships.filter(s => s.benefitType === 'weekly').length;

  const getSponsorshipStatus = (sponsorship: Sponsorship): { text: string; disabled: boolean; reason?: string } => {
    if (isPlayerBusy) {
      return { text: "자동 진행 중...", disabled: true, reason: "자동 진행 모드가 활성화되었거나 현재 다른 활동 중이므로 계약할 수 없습니다." };
    }
    if (activeSponsorships.some(active => active.id === sponsorship.id)) {
      const active = activeSponsorships.find(a => a.id === sponsorship.id);
      return { text: `계약 중 (${active?.weeksRemaining}주 남음)`, disabled: true, reason: "이미 계약 중입니다." };
    }
    if (completedSponsorshipIds.includes(sponsorship.id)) {
      return { text: "계약 완료", disabled: true, reason: "이미 완료된 계약입니다." };
    }
    if (reputation < sponsorship.reputationRequired) {
      return { text: "평판 부족", disabled: true, reason: `평판 ${sponsorship.reputationRequired} 필요` };
    }
    if (sponsorship.benefitType === 'weekly' && currentWeeklyActiveCount >= MAX_ACTIVE_WEEKLY_CONTRACTS) {
        return { text: "주간 계약 한도 초과", disabled: true, reason: `주간 계약은 동시에 ${MAX_ACTIVE_WEEKLY_CONTRACTS}개까지만 가능합니다.`};
    }
    return { text: "계약 체결", disabled: false };
  };

  return (
    <section className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-sky-400 mb-3 border-b border-slate-700 pb-2">스폰서 계약</h2>
      <p className="mb-1 text-sm">
        현재 자금: <span className="font-semibold text-green-400">${funds}</span>
      </p>
      <p className="mb-3 text-sm">
        현재 평판: <span className="font-semibold text-purple-400">{reputation}</span>
      </p>

      {activeSponsorships.length > 0 && (
        <div className="mb-4">
          <h3 className="text-md font-semibold text-slate-200 mb-2">진행 중인 계약:</h3>
          <ul className="space-y-2 text-xs">
            {activeSponsorships.map(s => (
              <li key={`active-${s.id}`} className="p-2 bg-slate-700 rounded">
                <p className="font-bold text-sky-300">{s.name}</p>
                <p>혜택: ${s.amount} ({s.benefitType === 'weekly' ? `주간, ${s.weeksRemaining}주 남음` : '일회성'})</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="text-md font-semibold text-slate-200 mb-2">가능한 계약:</h3>
      {availableSponsorships.length === 0 && <p className="text-sm text-slate-400 italic">현재 가능한 스폰서 계약이 없습니다.</p>}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {availableSponsorships.map(sponsorship => {
          const status = getSponsorshipStatus(sponsorship);
          const isActiveOrFullyCompleted = activeSponsorships.some(active => active.id === sponsorship.id) || completedSponsorshipIds.includes(sponsorship.id);

          return (
            <div key={sponsorship.id} className={`p-3 rounded-md ${status.disabled || isActiveOrFullyCompleted ? 'bg-slate-700 opacity-70' : 'bg-slate-700 hover:bg-slate-600/80'}`}>
              <h4 className="font-bold text-base text-sky-300">{sponsorship.name}</h4>
              <p className="text-xs text-slate-300 mb-1">{sponsorship.description}</p>
              <p className="text-xs">
                요구 평판: <span className={reputation >= sponsorship.reputationRequired ? "text-green-400" : "text-red-400"}>{sponsorship.reputationRequired}</span>
              </p>
              <p className="text-xs">
                혜택: <span className="text-yellow-400">${sponsorship.amount}</span> ({sponsorship.benefitType === 'weekly' ? `주간, ${sponsorship.durationWeeks}주 동안` : '일회성'})
              </p>
              <ActionButton
                onClick={() => onSignSponsorship(sponsorship.id)}
                disabled={status.disabled}
                className="w-full mt-2 text-sm py-1.5"
                title={status.reason || status.text}
              >
                {status.text}
              </ActionButton>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Sponsorships;