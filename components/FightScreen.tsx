
import React, { useEffect, useRef, useState } from 'react';
import { PlayerStats, Opponent, CurrentFightState, FightEvent } from '../types';

interface FightScreenProps {
  playerStats: PlayerStats;
  opponent: Opponent | null;
  fightState: CurrentFightState;
  consumeNextFightDisplayEvent: () => FightEvent | null;
  processNextFightAction: () => void;
}

const EVENT_DISPLAY_DELAY_MS = 1500;
const ROUND_MARKER_DISPLAY_DELAY_MS = 500;
const FIGHT_CONCLUSION_DISPLAY_DELAY_MS = 1500;
const INTER_STEP_DELAY_MS = 1000;

const ProgressBar: React.FC<{current: number, max: number, label: string, barColorClass: string, pulse?: boolean}> = ({current, max, label, barColorClass, pulse = false}) => {
    const percentage = max > 0 ? (Math.max(0, current) / max) * 100 : 0; // Ensure current is not negative for display
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-0.5">
                <span>{label}</span>
                <span>{Math.max(0, current)} / {max}</span> {/* Ensure current is not negative for display */}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3.5 overflow-hidden">
                <div
                    className={`h-3.5 rounded-full transition-all duration-500 ease-in-out ${barColorClass} ${pulse ? 'animate-pulse' : ''}`}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={Math.max(0, current)}
                    aria-valuemin={0}
                    aria-valuemax={max}
                ></div>
            </div>
        </div>
    );
};


const FightScreen: React.FC<FightScreenProps> = ({
  playerStats,
  opponent,
  fightState,
  consumeNextFightDisplayEvent,
  processNextFightAction,
}) => {
  // const [displayedEvents, setDisplayedEvents] = useState<FightEvent[]>([]); // Removed as log display is removed
  const [currentVisualPlayerHealth, setCurrentVisualPlayerHealth] = useState(0);
  const [currentVisualOpponentHealth, setCurrentVisualOpponentHealth] = useState(0);
  const [currentVisualPlayerStamina, setCurrentVisualPlayerStamina] = useState(0);
  const [currentVisualOpponentStamina, setCurrentVisualOpponentStamina] = useState(0);
  
  // const logContainerRef = useRef<HTMLDivElement>(null); // Removed
  const eventProcessingTimeoutRef = useRef<number | null>(null);

  // Initialize/Update visual stats when fightState changes
  useEffect(() => {
    if (fightState.playerSnapshot) {
        setCurrentVisualPlayerHealth(fightState.playerFightHealth);
        setCurrentVisualPlayerStamina(fightState.playerFightStamina);
    } else if (playerStats) { // Fallback before snapshot is ready
        setCurrentVisualPlayerHealth(playerStats.currentHealth);
        setCurrentVisualPlayerStamina(playerStats.currentStamina);
    }

    if (fightState.opponent) {
        setCurrentVisualOpponentHealth(fightState.opponentFightHealth);
        setCurrentVisualOpponentStamina(fightState.opponentFightStamina);
    } else if (opponent) { // Fallback before snapshot is ready
        setCurrentVisualOpponentHealth(opponent.stats.health);
        setCurrentVisualOpponentStamina(opponent.stats.stamina);
    }
  }, [
    fightState.playerSnapshot, fightState.opponent, 
    fightState.playerFightHealth, fightState.opponentFightHealth,
    fightState.playerFightStamina, fightState.opponentFightStamina,
    playerStats, opponent 
  ]);

  // useEffect for log scrolling removed as log display is removed

  useEffect(() => {
    const cleanupTimeout = () => {
        if (eventProcessingTimeoutRef.current) {
            clearTimeout(eventProcessingTimeoutRef.current);
            eventProcessingTimeoutRef.current = null;
        }
    };

    const scheduleProcessing = () => {
        cleanupTimeout(); 

        if (fightState.roundLog.length > 0) {
            const eventToDisplay = consumeNextFightDisplayEvent(); // Still consume to advance logic
            
            if (eventToDisplay) {
                // setDisplayedEvents(prev => [...prev, eventToDisplay]); // Removed
                
                let currentEventDelay = EVENT_DISPLAY_DELAY_MS;
                if (eventToDisplay.type === 'round_marker') {
                    currentEventDelay = ROUND_MARKER_DISPLAY_DELAY_MS;
                } else if (eventToDisplay.type === 'fight_conclusion') {
                    currentEventDelay = FIGHT_CONCLUSION_DISPLAY_DELAY_MS;
                }
                eventProcessingTimeoutRef.current = window.setTimeout(scheduleProcessing, currentEventDelay);
            } else {
                 eventProcessingTimeoutRef.current = window.setTimeout(() => {
                    processNextFightAction();
                }, INTER_STEP_DELAY_MS);
            }
        } 
        else { 
            if (fightState.uiReadyForNextEvent && !fightState.isProcessingRoundEvents && !fightState.isFightOver) {
                eventProcessingTimeoutRef.current = window.setTimeout(() => {
                    processNextFightAction();
                }, INTER_STEP_DELAY_MS);
            } else if (fightState.isFightOver && fightState.uiReadyForNextEvent && !fightState.isProcessingRoundEvents) {
                 eventProcessingTimeoutRef.current = window.setTimeout(() => {
                    processNextFightAction();
                }, INTER_STEP_DELAY_MS);
            }
        }
    };
    
    scheduleProcessing();

    return cleanupTimeout;
  }, [
    fightState.roundLog.length, 
    fightState.uiReadyForNextEvent, 
    fightState.isProcessingRoundEvents,
    fightState.isFightOver,
    // consumeNextFightDisplayEvent and processNextFightAction are stable callbacks
  ]);


  if (!opponent || !fightState.playerSnapshot) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">경기 정보를 불러오는 중...</div>;
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-2 md:p-6">
      <div className="bg-slate-900 shadow-2xl rounded-xl p-4 md:p-8 w-full max-w-3xl border border-slate-700">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-sky-400 mb-6">경기 진행 중</h1>
        
        {/* 라운드 표시 제거됨
        <div className="mb-2 text-center text-xl font-semibold text-yellow-300">
            {fightState.currentRound > 0 && !fightState.isFightOver ? `라운드 ${fightState.currentRound}` : fightState.isFightOver ? "경기 종료" : "경기 준비 중..."}
        </div>
        */}

        <div className="grid grid-cols-2 gap-4 md:gap-8 mb-6">
          <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700">
            <h2 className="text-lg md:text-xl font-semibold text-green-400 truncate mb-2">{fightState.playerSnapshot.playerName} <span className="text-xs">({fightState.playerSnapshot.rank})</span></h2>
            <ProgressBar label="체력" current={currentVisualPlayerHealth} max={fightState.playerSnapshot.health} barColorClass="bg-green-500" pulse={currentVisualPlayerHealth < fightState.playerSnapshot.health * 0.2}/>
            <ProgressBar label="스태미나" current={currentVisualPlayerStamina} max={fightState.playerSnapshot.stamina} barColorClass="bg-sky-500" />
          </div>

          <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700">
            <h2 className="text-lg md:text-xl font-semibold text-red-400 truncate mb-2">{opponent.name}</h2>
            <ProgressBar label="체력" current={currentVisualOpponentHealth} max={opponent.stats.health} barColorClass="bg-red-500" pulse={currentVisualOpponentHealth < opponent.stats.health * 0.2} />
            <ProgressBar label="스태미나" current={currentVisualOpponentStamina} max={opponent.stats.stamina} barColorClass="bg-sky-500" />
          </div>
        </div>

        {/* 경기 로그 영역 제거됨
        <div className="bg-slate-800 p-3 md:p-4 rounded-lg shadow-inner h-64 md:h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 border border-slate-700" ref={logContainerRef}>
          {displayedEvents.map((event) => (
            <p key={event.id} className={`text-sm md:text-base mb-1 ${getEventStyle(event)} transition-opacity duration-500 ease-in-out`}>
              {event.message}
            </p>
          ))}
          {(fightState.roundLog.length > 0 || (fightState.isProcessingRoundEvents && !fightState.isFightOver)) && !eventProcessingTimeoutRef.current && (
             <p className="text-slate-500 italic text-xs animate-pulse">다음 이벤트 준비 중...</p>
          )}
        </div>
        */}
      </div>
    </div>
  );
};

export default FightScreen;
