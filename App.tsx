
import React, { useState, useEffect } from 'react';
import useGameLogic from './hooks/useGameLogic';
import { TRAINING_OPTIONS, INITIAL_PLAYER_STATS } from './constants';
import { GamePhase } from './types';
import StatsChart from './components/StatsChart';
import ActionButton from './components/ActionButton';
import LogDisplay from './components/LogDisplay';
import FightResultModal from './components/FightResultModal';
import Sponsorships from './components/Sponsorships';
import TrainingCampDisplay from './components/TrainingCampDisplay'; 
import FightScreen from './components/FightScreen';

const App: React.FC = () => {
  const {
    playerStats, gameWeek, logs, setPlayerName, handleTraining, initiateFight,
    currentOpponent, gamePhase, fightState, consumeNextFightDisplayEvent, processNextFightAction,
    fightResult, isModalOpen, closeFightModal, modalTitle, modalRewards, fightLogForModal,
    chartData, getAvailableOpponents, handleRestart,
    handleSignSponsorship, availableSponsorships, currentNewsMessage,
    availableTrainingCamps, activeTrainingCamp, trainingCampWeeksRemaining, startTrainingCamp,
    isAutoPilotEnabled, toggleAutoPilot, // New state and function for auto-pilot
  } = useGameLogic();

  const [tempPlayerName, setTempPlayerName] = useState("");

  useEffect(() => {
    if (gamePhase === GamePhase.PLAYER_SETUP && playerStats.playerName && playerStats.playerName !== INITIAL_PLAYER_STATS.playerName) {
      setTempPlayerName(playerStats.playerName);
    } else if (gamePhase === GamePhase.PLAYER_SETUP) {
      setTempPlayerName(""); 
    }
  }, [gamePhase, playerStats.playerName]);
  
  const handleSubmitPlayerName = () => {
    setPlayerName(tempPlayerName || INITIAL_PLAYER_STATS.playerName);
  };

  const opponentsToDisplay = getAvailableOpponents();
  const isPlayerBusyInMenu = gamePhase === GamePhase.IN_TRAINING_CAMP || gamePhase !== GamePhase.MENU;


  if (gamePhase === GamePhase.PLAYER_SETUP) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center w-full max-w-md">
          <h1 className="text-3xl font-bold text-sky-400 mb-6">복서 이름 등록</h1>
          <p className="text-slate-300 mb-4">당신의 복서에게 이름을 지어주세요.</p>
          <input
            type="text"
            value={tempPlayerName}
            onChange={(e) => setTempPlayerName(e.target.value)}
            placeholder={`예: ${INITIAL_PLAYER_STATS.playerName}`}
            className="w-full p-3 mb-6 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:ring-sky-500 focus:border-sky-500"
            maxLength={15}
            aria-label="복서 이름 입력"
          />
          <ActionButton onClick={handleSubmitPlayerName} className="w-full bg-sky-600 hover:bg-sky-700">
            이 이름으로 시작
          </ActionButton>
           <p className="text-xs text-slate-500 mt-4">비워두면 "{INITIAL_PLAYER_STATS.playerName}"(으)로 시작합니다.</p>
        </div>
      </div>
    );
  }

  if (gamePhase === GamePhase.GAME_OVER) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">게임 오버</h1>
          <p className="text-lg mb-2">"{playerStats.playerName}" 선수는 더 이상 싸울 수 없습니다...</p>
          <p className="mb-1">최종 기록: {playerStats.wins}승 {playerStats.losses}패</p>
          <p className="mb-1">최종 랭크: {playerStats.rank}</p>
          <p className="mb-1">최종 명성: {playerStats.reputation}</p>
          {playerStats.traits.length > 0 && <p className="mb-1">획득 특성: {playerStats.traits.join(', ')}</p>}
          <p className="mb-6">캠프 참가 횟수: {logs.filter(log => log.type === 'camp' && log.message.includes("참가!")).length}회</p>
          <ActionButton onClick={handleRestart} className="bg-sky-600 hover:bg-sky-700">
            새 게임 시작
          </ActionButton>
        </div>
      </div>
    );
  }

  if (gamePhase === GamePhase.FIGHTING) {
    return (
      <FightScreen
        playerStats={playerStats}
        opponent={currentOpponent}
        fightState={fightState}
        consumeNextFightDisplayEvent={consumeNextFightDisplayEvent}
        processNextFightAction={processNextFightAction}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-5xl mb-6 text-center">
        <h1 className="text-4xl font-bold text-sky-400">챔피언 메이커</h1>
        <div className="text-slate-300 text-base md:text-lg my-2">
          <p>
            복서: <span className="font-semibold text-yellow-300">{playerStats.playerName}</span> | 
            주차: {gameWeek}주 | 
            랭크: <span className="font-semibold text-yellow-400">{playerStats.rank}</span>
          </p>
          <p>
            전적: {playerStats.wins}승 {playerStats.losses}패 | 
            명성: <span className="font-semibold text-purple-400">{playerStats.reputation}</span> |
            자금: <span className="font-semibold text-green-400">${playerStats.funds}</span>
          </p>
           {playerStats.traits.length > 0 && (
            <p className="text-sm text-cyan-300">보유 특성: {playerStats.traits.join(', ')}</p>
          )}
        </div>
        <div className="mt-3">
          <ActionButton 
            onClick={toggleAutoPilot} 
            className={`px-3 py-1.5 text-sm ${isAutoPilotEnabled ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
            title={isAutoPilotEnabled ? "자동 진행 모드 비활성화" : "자동 진행 모드 활성화"}
          >
            {isAutoPilotEnabled ? '자동 진행 끄기' : '자동 진행 켜기'}
            {isAutoPilotEnabled && <span className="ml-2 text-xs opacity-80">(CPU 제어 중)</span>}
          </ActionButton>
        </div>
      </header>

      {currentNewsMessage && (
        <section className="w-full max-w-3xl mb-6 bg-slate-700/80 p-3 rounded-lg shadow-md">
          <h2 className="text-sm font-semibold text-sky-300 mb-1">금주의 소식</h2>
          <p className="text-xs text-slate-200 italic">{currentNewsMessage}</p>
        </section>
      )}

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-6">
            <section className="bg-slate-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-sky-400 mb-3 border-b border-slate-700 pb-2">선수 정보</h2>
            <div className="space-y-1 text-sm mb-4">
                <p>현재 건강: <span className={playerStats.currentHealth < playerStats.health * 0.3 ? 'text-red-400 font-bold animate-pulse' : playerStats.currentHealth < playerStats.health * 0.6 ? 'text-yellow-400' : 'text-green-400'}>{playerStats.currentHealth}</span> / {playerStats.health}</p>
                <div className="w-full bg-slate-700 rounded-full h-2.5 relative overflow-hidden" role="progressbar" aria-valuenow={playerStats.currentHealth} aria-valuemin={0} aria-valuemax={playerStats.health} aria-label="현재 건강">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ease-out ${playerStats.currentHealth < playerStats.health * 0.3 ? 'bg-red-500' : playerStats.currentHealth < playerStats.health * 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${(playerStats.currentHealth / playerStats.health) * 100}%`}}
                    ></div>
                </div>
                <p>현재 스태미나: <span className={playerStats.currentStamina < playerStats.stamina * 0.3 ? 'text-red-400 font-bold' : playerStats.currentStamina < playerStats.stamina * 0.6 ? 'text-yellow-400' : 'text-green-400'}>{playerStats.currentStamina}</span> / {playerStats.stamina}</p>
                <div className="w-full bg-slate-700 rounded-full h-2.5" role="progressbar" aria-valuenow={playerStats.currentStamina} aria-valuemin={0} aria-valuemax={playerStats.stamina} aria-label="현재 스태미나">
                    <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ease-out ${playerStats.currentStamina < playerStats.stamina * 0.3 ? 'bg-red-500' : playerStats.currentStamina < playerStats.stamina * 0.6 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                        style={{ width: `${(playerStats.currentStamina / playerStats.stamina) * 100}%`}}
                    ></div>
                </div>
            </div>
            <StatsChart data={chartData} />
            </section>
        </div>
        
        <section className="md:col-span-2 bg-slate-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-sky-400 mb-3 border-b border-slate-700 pb-2">활동 선택</h2>
          { gamePhase === GamePhase.IN_TRAINING_CAMP && activeTrainingCamp && (
            <div className="mb-4 p-3 bg-sky-700/30 rounded-md text-center">
                <p className="font-semibold text-lg text-sky-300">{activeTrainingCamp.name} 훈련 캠프 진행 중...</p>
                <p className="text-sm text-slate-300">{trainingCampWeeksRemaining}주 남음. 캠프 완료 시까지 다른 활동 불가.</p>
            </div>
          )}
          {isAutoPilotEnabled && gamePhase === GamePhase.MENU && !activeTrainingCamp && (
            <div className="mb-4 p-3 bg-green-700/30 rounded-md text-center">
                <p className="font-semibold text-lg text-green-300 animate-pulse">자동 진행 모드 활성 중...</p>
                <p className="text-sm text-slate-300">CPU가 다음 행동을 결정하고 있습니다.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {TRAINING_OPTIONS.map(opt => (
              <ActionButton
                key={opt.id}
                onClick={() => handleTraining(opt.id)}
                disabled={isPlayerBusyInMenu || playerStats.currentStamina < opt.staminaCost || isAutoPilotEnabled}
                className="w-full text-left flex flex-col p-3 h-full"
                title={isAutoPilotEnabled ? "자동 진행 중에는 수동 조작 불가" : isPlayerBusyInMenu ? "현재 다른 활동 중" : (opt.staminaCost > 0 ? `스태미나 ${opt.staminaCost} 소모` : '스태미나 소모 없음')}
              >
                <span className="font-bold">{opt.name}</span>
                <span className="text-xs text-slate-300 mt-1 block flex-grow">{opt.description}</span>
                {opt.staminaCost > 0 && <span className="text-xs text-red-300 mt-1 block">스태미나 소모: {opt.staminaCost}</span>}
                 {opt.effects.healthChange && opt.effects.healthChange < 0 && <span className="text-xs text-orange-400 mt-1 block">건강 변화: {opt.effects.healthChange}</span>}
                 {opt.effects.healthChange && opt.effects.healthChange > 0 && <span className="text-xs text-green-300 mt-1 block">건강 변화: +{opt.effects.healthChange}</span>}
              </ActionButton>
            ))}
          </div>
          
          <h3 className="text-xl font-semibold text-sky-400 mb-2 border-b border-slate-700 pb-1">경기 상대</h3>
          {opponentsToDisplay.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            {opponentsToDisplay.map(op => (
              <div key={op.id} className="bg-slate-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h4 className="font-semibold text-lg">{op.name} <span className="text-xs text-slate-400">({op.stats.strength}힘/{op.stats.speed}속/{op.stats.stamina}체/{op.stats.technique}기)</span></h4>
                  <p className="text-xs text-slate-300">{op.description}</p>
                  {op.rankRequired && <p className="text-xs text-sky-300">요구 랭크: {op.rankRequired}</p>}
                </div>
                <ActionButton
                  onClick={() => initiateFight(op)}
                  disabled={isPlayerBusyInMenu || playerStats.currentHealth < 30 || playerStats.currentStamina < 20 || isAutoPilotEnabled}
                  title={isAutoPilotEnabled ? "자동 진행 중에는 수동 조작 불가" : isPlayerBusyInMenu ? "현재 다른 활동 중" : (playerStats.currentHealth < 30 ? "건강 부족 (30 이상 필요)" : playerStats.currentStamina < 20 ? "스태미나 부족 (20 이상 필요)" : `경기 시작`)}
                  className="w-full sm:w-auto flex-shrink-0"
                >
                  도전
                </ActionButton>
              </div>
            ))}
            </div>
          ) : (
            <p className="text-slate-400 italic">현재 도전 가능한 상대가 없습니다. 랭크를 올리거나 이전 상대를 다시 찾아보세요.</p>
          )}

          <div className="mt-6">
            <Sponsorships 
                funds={playerStats.funds}
                activeSponsorships={playerStats.activeSponsorships}
                completedSponsorshipIds={playerStats.completedSponsorshipIds}
                availableSponsorships={availableSponsorships}
                onSignSponsorship={handleSignSponsorship}
                reputation={playerStats.reputation}
                isPlayerBusy={isPlayerBusyInMenu || isAutoPilotEnabled}
            />
          </div>
          
          <div className="mt-6">
            <TrainingCampDisplay
              availableCamps={availableTrainingCamps}
              activeCamp={activeTrainingCamp}
              weeksRemaining={trainingCampWeeksRemaining}
              onStartCamp={startTrainingCamp}
              playerFunds={playerStats.funds}
              playerReputation={playerStats.reputation}
              playerStats={playerStats} 
              isPlayerBusy={isPlayerBusyInMenu || isAutoPilotEnabled}
            />
          </div>

        </section>

        <section className="md:col-span-3"> 
          <LogDisplay logs={logs} />
        </section>
      </main>

      <FightResultModal
        isOpen={isModalOpen}
        onClose={closeFightModal}
        result={fightResult}
        title={modalTitle}
        details={fightLogForModal}
        rewards={modalRewards}
      />
       <footer className="w-full max-w-5xl mt-8 text-center">
          <ActionButton onClick={handleRestart} className="bg-red-600 hover:bg-red-700 mr-4">
            게임 재시작
          </ActionButton>
          <p className="text-xs text-slate-500 mt-4">챔피언 메이커 v1.8.1</p>
      </footer>
    </div>
  );
};

export default App;
