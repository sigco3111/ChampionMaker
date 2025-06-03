
import { useState, useCallback, useEffect, useRef } from 'react';
import { PlayerStats, TrainingOption, TrainingType, Opponent, LogEntry, GamePhase, ChartDataItem, STAT_NAMES_KOREAN, Sponsorship, ActiveSponsorship, GameNewsEvent, TrainingCamp, CurrentFightState, FightEvent, PlayerSnapshot } from '../types';
import { INITIAL_PLAYER_STATS, TRAINING_OPTIONS, OPPONENTS, MAX_STAT_VALUE, MAX_HEALTH, RANKS, RANK_UP_WINS, REPUTATION_GAIN_WIN_DEFAULT, REPUTATION_LOSS_DEFAULT, REPUTATION_GAIN_WIN_RANK_BONUS, AVAILABLE_SPONSORSHIPS, GAME_NEWS_EVENTS, TRAINING_CAMPS } from '../constants';

const SAVE_KEY = 'championMakerSaveData_v1.0';

const INITIAL_FIGHT_STATE: CurrentFightState = {
  opponent: null,
  playerSnapshot: null,
  playerFightHealth: 0,
  playerFightStamina: 0,
  opponentFightHealth: 0,
  opponentFightStamina: 0,
  currentRound: 0,
  roundLog: [],
  fullFightTranscript: [],
  isFightOver: false,
  winner: null,
  isProcessingRoundEvents: false,
  uiReadyForNextEvent: true,
};

const MAX_FIGHT_ROUNDS = 5;
const AUTO_PILOT_ACTION_DELAY_MS = 2500; // 2.5 seconds for CPU "thinking" time
const AUTO_MODAL_CLOSE_DELAY_MS = 2000; // 2 seconds for auto-closing modals

const useGameLogic = () => {
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_PLAYER_STATS);
  const [gameWeek, setGameWeek] = useState<number>(1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentOpponent, setCurrentOpponent] = useState<Opponent | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.PLAYER_SETUP);
  const [fightLogForModal, setFightLogForModal] = useState<string[]>([]);
  const [fightResult, setFightResult] = useState<"승리" | "패배" | "">("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>("");
  const [modalRewards, setModalRewards] = useState<string>("");
  const [currentNewsMessage, setCurrentNewsMessage] = useState<string | null>(null);

  const [activeTrainingCamp, setActiveTrainingCamp] = useState<TrainingCamp | null>(null);
  const [trainingCampWeeksRemaining, setTrainingCampWeeksRemaining] = useState<number>(0);

  const [fightState, setFightState] = useState<CurrentFightState>(INITIAL_FIGHT_STATE);

  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const autoPilotActionTimeoutRef = useRef<number | null>(null);

  // Auto-close fight result modal in auto-pilot mode
  useEffect(() => {
    let timerId: number | null = null;
    if (isAutoPilotEnabled && isModalOpen && gamePhase === GamePhase.FIGHT_RESULT) {
      addLog("자동 진행: 경기 결과 확인 중... 잠시 후 자동으로 닫힙니다.", "info");
      timerId = window.setTimeout(() => {
        // Double check conditions before closing, in case state changed by user action or other effects
        if (isAutoPilotEnabled && isModalOpen && gamePhase === GamePhase.FIGHT_RESULT) {
          closeFightModal();
        }
      }, AUTO_MODAL_CLOSE_DELAY_MS);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isAutoPilotEnabled, isModalOpen, gamePhase, /* closeFightModal and addLog are stable */ ]);


  // Load game state
  useEffect(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const loadedState = JSON.parse(savedData);
        if (loadedState.playerStats && loadedState.gamePhase && Object.values(GamePhase).includes(loadedState.gamePhase)) {
          const loadedPlayerStats: PlayerStats = {
            ...INITIAL_PLAYER_STATS,
            ...(loadedState.playerStats || {}),
            activeSponsorships: (loadedState.playerStats?.activeSponsorships) || [],
            completedSponsorshipIds: (loadedState.playerStats?.completedSponsorshipIds) || [],
            traits: (loadedState.playerStats?.traits) || [],
          };
          setPlayerStats(loadedPlayerStats);
          setGameWeek(loadedState.gameWeek || 1);
          setLogs(loadedState.logs || []);
          setCurrentNewsMessage(loadedState.currentNewsMessage || null);
          setActiveTrainingCamp(loadedState.activeTrainingCamp || null);
          setTrainingCampWeeksRemaining(loadedState.trainingCampWeeksRemaining || 0);
          setIsAutoPilotEnabled(loadedState.isAutoPilotEnabled || false);
          
          if (loadedState.gamePhase === GamePhase.FIGHTING) {
            setGamePhase(GamePhase.MENU);
            setFightState(INITIAL_FIGHT_STATE);
          } else {
            setGamePhase(loadedState.gamePhase);
          }
          
        } else {
          localStorage.removeItem(SAVE_KEY);
          setGamePhase(GamePhase.PLAYER_SETUP);
          setPlayerStats(INITIAL_PLAYER_STATS);
          setIsAutoPilotEnabled(false);
        }
      } catch (error) {
        console.error("Failed to load game state:", error);
        localStorage.removeItem(SAVE_KEY);
        setGamePhase(GamePhase.PLAYER_SETUP);
        setPlayerStats(INITIAL_PLAYER_STATS);
        setIsAutoPilotEnabled(false);
      }
    } else {
      setPlayerStats(INITIAL_PLAYER_STATS);
      setIsAutoPilotEnabled(false);
    }
  }, []);

  const saveGameState = useCallback(() => {
    if (gamePhase === GamePhase.PLAYER_SETUP || gamePhase === GamePhase.FIGHTING) {
      return;
    }
    const gameStateToSave = {
      playerStats,
      gameWeek,
      logs,
      currentNewsMessage,
      activeTrainingCamp,
      trainingCampWeeksRemaining,
      gamePhase,
      isAutoPilotEnabled, // Save auto-pilot state
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameStateToSave));
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [playerStats, gameWeek, logs, currentNewsMessage, activeTrainingCamp, trainingCampWeeksRemaining, gamePhase, isAutoPilotEnabled]);

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);


  const addLog = useCallback((message: string, type: LogEntry['type'] = "info") => {
    setLogs(prevLogs => [...prevLogs, { id: crypto.randomUUID(), message, type, week: gameWeek }]);
  }, [gameWeek]);

  const setPlayerName = useCallback((name: string) => {
    const finalName = name.trim() === "" ? INITIAL_PLAYER_STATS.playerName : name.trim();
    setPlayerStats({
      ...INITIAL_PLAYER_STATS,
      playerName: finalName,
    });
    setGamePhase(GamePhase.MENU);
    setGameWeek(1);
    setLogs([{ id: crypto.randomUUID(), message: `복서 "${finalName}"(으)로 새로운 여정을 시작합니다!`, type: "info", week: 1 }]);
    setCurrentNewsMessage("첫 주를 시작합니다! 행운을 빕니다!");
    setActiveTrainingCamp(null);
    setTrainingCampWeeksRemaining(0);
    setFightState(INITIAL_FIGHT_STATE);
    setIsAutoPilotEnabled(false); // Reset autopilot on new game
  }, []);

  const processWeeklyNews = useCallback(() => {
    const eligibleEvents = GAME_NEWS_EVENTS.filter(event => {
        if (event.condition) {
            return event.condition(playerStats, gameWeek);
        }
        return true;
    });

    if (eligibleEvents.length > 0) {
        const randomIndex = Math.floor(Math.random() * eligibleEvents.length);
        const selectedEvent = eligibleEvents[randomIndex];
        setCurrentNewsMessage(selectedEvent.message);
        let logEffectsMessage = "";
        if (selectedEvent.effects && selectedEvent.effects.length > 0) {
            setPlayerStats(prev => {
                let newStats = { ...prev };
                selectedEvent.effects?.forEach(effect => {
                    switch (effect.type) {
                        case 'funds': newStats.funds = Math.max(0, newStats.funds + effect.value); break;
                        case 'reputation': newStats.reputation = Math.max(0, newStats.reputation + effect.value); break;
                        case 'currentHealth': newStats.currentHealth = Math.min(newStats.health, Math.max(0, newStats.currentHealth + effect.value)); break;
                        case 'currentStamina': newStats.currentStamina = Math.min(newStats.stamina, Math.max(0, newStats.currentStamina + effect.value)); break;
                        case 'strength': case 'speed': case 'technique': case 'stamina':
                             newStats[effect.type] = Math.min(MAX_STAT_VALUE, Math.max(0, (newStats[effect.type] as number) + effect.value));
                             if (effect.type === 'stamina') newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina);
                             break;
                    }
                    logEffectsMessage += `${effect.message || `${effect.type} ${effect.value > 0 ? '+' : ''}${effect.value}`} `;
                });
                return newStats;
            });
        }
        const finalLogMessage = `${selectedEvent.logMessage || selectedEvent.message}${logEffectsMessage ? ` (${logEffectsMessage.trim()})` : ''}`;
        addLog(`[주간 소식] ${finalLogMessage}`, "news");
    } else {
        setCurrentNewsMessage("이번 주는 특별한 소식이 없습니다.");
        addLog("[주간 소식] 이번 주는 특별한 소식이 없습니다.", "news");
    }
  }, [playerStats, gameWeek, addLog]);


  const advanceWeek = useCallback(() => {
    setGameWeek(prevWeek => prevWeek + 1);
    processWeeklyNews();

    if (activeTrainingCamp && trainingCampWeeksRemaining > 0) {
        setTrainingCampWeeksRemaining(prev => prev - 1);
        setPlayerStats(prev => {
            let newStats = { ...prev };
            let weeklyIncome = 0;
            const updatedActiveSponsorships: ActiveSponsorship[] = [];
            const newlyCompletedIds: string[] = [];

            newStats.activeSponsorships.forEach(sponsorship => {
                weeklyIncome += sponsorship.amount;
                const newWeeksRemaining = sponsorship.weeksRemaining - 1;
                if (newWeeksRemaining > 0) {
                    updatedActiveSponsorships.push({ ...sponsorship, weeksRemaining: newWeeksRemaining });
                } else {
                    newlyCompletedIds.push(sponsorship.id);
                    addLog(`${sponsorship.name} 계약이 만료되었습니다.`, "finance");
                }
            });
            
            if (weeklyIncome > 0) addLog(`스폰서 수입 (캠프 중): $${weeklyIncome}.`, "finance");
            newStats.funds += weeklyIncome;
            newStats.activeSponsorships = updatedActiveSponsorships;
            newStats.completedSponsorshipIds = [...newStats.completedSponsorshipIds, ...newlyCompletedIds];
            return newStats;
        });

        if (trainingCampWeeksRemaining - 1 <= 0) {
            addLog(`${activeTrainingCamp.name} 훈련 캠프 완료!`, "camp");
            setPlayerStats(prev => {
                let newStats = { ...prev };
                let effectMessages: string[] = [];
                activeTrainingCamp.effects.forEach(effect => {
                    const currentVal = newStats[effect.stat as keyof PlayerStats] as number;
                    (newStats[effect.stat as keyof PlayerStats] as number) = Math.min(MAX_STAT_VALUE, currentVal + effect.value);
                    effectMessages.push(`${STAT_NAMES_KOREAN[effect.stat as keyof typeof STAT_NAMES_KOREAN] || effect.stat} +${effect.value}`);
                    if (effect.stat === 'health') newStats.currentHealth = Math.min(newStats.health, newStats.currentHealth + effect.value);
                    if (effect.stat === 'stamina') newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina + effect.value);
                });
                if (activeTrainingCamp.traitAwarded && !newStats.traits.includes(activeTrainingCamp.traitAwarded)) {
                    newStats.traits = [...newStats.traits, activeTrainingCamp.traitAwarded];
                    effectMessages.push(`특성 획득: ${activeTrainingCamp.traitAwarded}`);
                }
                addLog(`캠프 효과: ${effectMessages.join(', ')}`, "success");
                return newStats;
            });
            setActiveTrainingCamp(null);
            setGamePhase(GamePhase.MENU);
        } else {
             addLog(`${activeTrainingCamp.name} 훈련 중... (${trainingCampWeeksRemaining -1}주 남음)`, "camp");
        }
    } else {
        setPlayerStats(prev => {
            let newStats = { ...prev };
            if (!activeTrainingCamp) {
                newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina + 5);
                newStats.currentHealth = Math.min(newStats.health, newStats.currentHealth + 2);
            }
            let weeklyIncome = 0;
            const updatedActiveSponsorships: ActiveSponsorship[] = [];
            const newlyCompletedIds: string[] = [];
            newStats.activeSponsorships.forEach(sponsorship => {
                weeklyIncome += sponsorship.amount;
                const newWeeksRemaining = sponsorship.weeksRemaining - 1;
                if (newWeeksRemaining > 0) {
                    updatedActiveSponsorships.push({ ...sponsorship, weeksRemaining: newWeeksRemaining });
                } else {
                    newlyCompletedIds.push(sponsorship.id);
                    addLog(`${sponsorship.name} 계약이 만료되었습니다.`, "finance");
                }
            });
            if (weeklyIncome > 0) addLog(`스폰서 수입: $${weeklyIncome}.`, "finance");
            newStats.funds += weeklyIncome;
            newStats.activeSponsorships = updatedActiveSponsorships;
            newStats.completedSponsorshipIds = [...newStats.completedSponsorshipIds, ...newlyCompletedIds];
            return newStats;
        });
    }
  }, [addLog, processWeeklyNews, activeTrainingCamp, trainingCampWeeksRemaining, playerStats.activeSponsorships, playerStats.completedSponsorshipIds]);


  const handleTraining = useCallback((trainingId: TrainingType) => {
    if (gamePhase === GamePhase.IN_TRAINING_CAMP) {
        addLog("훈련 캠프 중에는 일반 훈련을 할 수 없습니다.", "error"); return;
    }
    const option = TRAINING_OPTIONS.find(opt => opt.id === trainingId);
    if (!option || playerStats.currentStamina < option.staminaCost) {
      addLog(option ? "스태미나가 부족하여 훈련할 수 없습니다." : "잘못된 훈련입니다.", "error"); return;
    }

    setPlayerStats(prev => {
      const newStats = { ...prev };
      newStats.currentStamina = Math.max(0, newStats.currentStamina - option.staminaCost);
      let effectMessages: string[] = [];
      for (const key in option.effects) {
        const statKey = key as keyof typeof option.effects;
        const change = option.effects[statKey]!;
        if (statKey === 'healthChange') {
            newStats.currentHealth = Math.min(MAX_HEALTH, Math.max(0, newStats.currentHealth + change));
            effectMessages.push(`건강 ${change > 0 ? '+' : ''}${change}`);
        } else if (statKey === 'staminaChange') {
            newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina + change);
            effectMessages.push(`현재 스태미나 ${change > 0 ? '+' : ''}${change}`);
        } else if (statKey in newStats) {
            const sKey = statKey as keyof Omit<PlayerStats, 'wins' | 'losses' | 'rank' | 'currentHealth' | 'currentStamina' | 'playerName' | 'reputation' | 'funds' | 'activeSponsorships' | 'completedSponsorshipIds' | 'traits'>;
            const currentVal = newStats[sKey];
             if (typeof currentVal === 'number' && typeof change === 'number') {
                (newStats[sKey] as number) = Math.min(MAX_STAT_VALUE, currentVal + change);
                if (sKey === 'stamina') newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina);
                if (sKey === 'health') newStats.currentHealth = Math.min(newStats.health, newStats.currentHealth);
                effectMessages.push(`${STAT_NAMES_KOREAN[sKey]} ${change > 0 ? '+' : ''}${change}`);
            }
        }
      }
      addLog(`${option.name} 완료. ${effectMessages.join(', ')}. 스태미나 -${option.staminaCost}`, "success");
      if (newStats.currentHealth <= 0) {
        addLog("훈련 중 부상으로 건강이 0이 되었습니다. 게임 오버.", "error");
        setGamePhase(GamePhase.GAME_OVER);
      }
      return newStats;
    });
    setGamePhase(currentPhase => { // Use functional update for gamePhase
        if (playerStats.currentHealth > 0) { // Check health *before* advancing week
            advanceWeek();
            return GamePhase.MENU;
        }
        return GamePhase.GAME_OVER; // If health is 0 or less, it's game over
    });
  }, [playerStats, addLog, advanceWeek, gamePhase]);

  const checkRankUp = useCallback(() => {
    setPlayerStats(prev => {
        const currentRankIndex = RANKS.indexOf(prev.rank);
        if (currentRankIndex === -1 || currentRankIndex === RANKS.length - 1) return prev;
        const winsNeeded = RANK_UP_WINS[prev.rank as keyof typeof RANK_UP_WINS];
        // Rank up condition: enough wins for current rank AND (0 losses OR win ratio > 60%)
        if (winsNeeded && prev.wins >= winsNeeded && (prev.losses === 0 || prev.wins / (prev.wins + prev.losses) > 0.6) ) {
            const nextRank = RANKS[currentRankIndex + 1];
            if (nextRank) {
                addLog(`축하합니다! ${prev.rank}에서 ${nextRank}(으)로 승급했습니다! 명성 +${REPUTATION_GAIN_WIN_RANK_BONUS * 2}`, "success");
                return { ...prev, rank: nextRank, reputation: prev.reputation + REPUTATION_GAIN_WIN_RANK_BONUS * 2, wins: 0, losses: 0 }; // Reset wins/losses for new rank
            }
        }
        return prev;
    });
  }, [addLog]);


  const _processSingleFightRound = useCallback(() => {
    setFightState(prevFightData => {
        if (!prevFightData.opponent || !prevFightData.playerSnapshot || prevFightData.isFightOver) return prevFightData;
        const roundEvents: FightEvent[] = [];
        let { playerFightHealth, opponentFightHealth, playerFightStamina, opponentFightStamina, isFightOver, winner } = prevFightData;
        const { playerSnapshot, opponent, currentRound } = prevFightData;
        const createEvent = (type: FightEvent['type'], message: string, data?: Partial<FightEvent>): FightEvent => ({
            id: crypto.randomUUID(), type, message, ...data
        });
        if (currentRound === 1 && prevFightData.roundLog.length === 0 && prevFightData.fullFightTranscript.length === 0) {
            roundEvents.push(createEvent('text', `경기 시작! ${playerSnapshot.playerName} vs ${opponent.name}`));
        }
        roundEvents.push(createEvent('round_marker', `--- ${currentRound} 라운드 ---`));
        if (!isFightOver) {
            let playerHitChance = (playerSnapshot.speed + playerSnapshot.technique * 1.5) / (playerSnapshot.speed + playerSnapshot.technique * 1.5 + opponent.stats.speed + opponent.stats.technique) * (playerFightStamina / playerSnapshot.stamina * 0.5 + 0.5);
            if (playerSnapshot.traits.includes("정교한 타격")) playerHitChance *= 1.1;
            if (Math.random() < playerHitChance) {
                let playerDamage = Math.max(1, Math.floor(playerSnapshot.strength * (1 + playerSnapshot.technique / 50) - opponent.stats.technique / 5 + (Math.random() * 5 - 2.5)));
                playerDamage = Math.floor(playerDamage * (playerFightStamina / playerSnapshot.stamina * 0.7 + 0.3));
                 if (playerSnapshot.traits.includes("파괴자")) playerDamage = Math.floor(playerDamage * 1.15);
                opponentFightHealth = Math.max(0, opponentFightHealth - playerDamage);
                roundEvents.push(createEvent('player_action', `${playerSnapshot.playerName}의 공격! ${opponent.name}에게 ${playerDamage}의 데미지!`, { opponentHealth: opponentFightHealth, isDamage: true }));
                if (opponentFightHealth <= 0) {
                    winner = "player"; isFightOver = true;
                    roundEvents.push(createEvent('text', `${opponent.name} K.O! ${playerSnapshot.playerName}의 승리입니다!`, { isCritical: true }));
                }
            } else {
                roundEvents.push(createEvent('player_action', `${playerSnapshot.playerName}의 공격이 빗나갔습니다!`));
            }
            playerFightStamina = Math.max(0, playerFightStamina - (7 + Math.floor(Math.random() * 3)));
            roundEvents.push(createEvent('stamina_update', `${playerSnapshot.playerName} 스태미나 변화`, { playerStamina: playerFightStamina }));
        }
        if (!isFightOver) {
            let opponentHitChance = (opponent.stats.speed + opponent.stats.technique * 1.5) / (opponent.stats.speed + opponent.stats.technique * 1.5 + playerSnapshot.speed + playerSnapshot.technique) * (opponentFightStamina / opponent.stats.stamina * 0.5 + 0.5);
            if (Math.random() < opponentHitChance) {
                let opponentDamage = Math.max(1, Math.floor(opponent.stats.strength * (1 + opponent.stats.technique / 50) - playerSnapshot.technique / 5 + (Math.random() * 5 - 2.5)));
                opponentDamage = Math.floor(opponentDamage * (opponentFightStamina / opponent.stats.stamina * 0.7 + 0.3));
                if (playerSnapshot.traits.includes("강철 맷집")) opponentDamage = Math.floor(opponentDamage * 0.85);
                playerFightHealth = Math.max(0, playerFightHealth - opponentDamage);
                roundEvents.push(createEvent('opponent_action', `${opponent.name}의 공격! ${playerSnapshot.playerName}은(는) ${opponentDamage}의 데미지를 입었습니다!`, { playerHealth: playerFightHealth, isDamage: true }));
                if (playerFightHealth <= 0) {
                    winner = "opponent"; isFightOver = true;
                    roundEvents.push(createEvent('text', `${playerSnapshot.playerName} K.O! ${opponent.name}의 승리입니다!`, { isCritical: true }));
                }
            } else {
                roundEvents.push(createEvent('opponent_action', `${opponent.name}의 공격이 빗나갔습니다!`));
            }
            opponentFightStamina = Math.max(0, opponentFightStamina - (7 + Math.floor(Math.random() * 3)));
            roundEvents.push(createEvent('stamina_update', `${opponent.name} 스태미나 변화`, { opponentStamina: opponentFightStamina }));
        }
        roundEvents.push(createEvent('text', `(플레이어 체력: ${playerFightHealth}, 스태미나: ${playerFightStamina} / ${opponent.name} 체력: ${opponentFightHealth}, 스태미나: ${opponentFightStamina})`));
        if (!isFightOver && currentRound >= MAX_FIGHT_ROUNDS) {
            roundEvents.push(createEvent('text', `--- 경기 종료: 판정 ---`));
            isFightOver = true;
            const playerHealthPercent = playerFightHealth / playerSnapshot.health;
            const opponentHealthPercent = opponentFightHealth / opponent.stats.health;
            if (playerHealthPercent > opponentHealthPercent) winner = "player";
            else if (opponentHealthPercent > playerHealthPercent) winner = "opponent";
            else winner = Math.random() > 0.5 ? "player" : "opponent"; // Draw decided by coin flip
            roundEvents.push(createEvent('text', `판정 결과: ${winner === "player" ? playerSnapshot.playerName : opponent.name} 승리!`));
        }
        if (isFightOver) {
            roundEvents.push(createEvent('fight_conclusion', winner === 'player' ? "경기 결과: 당신의 승리!" : "경기 결과: 당신의 패배...", {isCritical: true}));
        }
        return {
            ...prevFightData, playerFightHealth, opponentFightHealth, playerFightStamina, opponentFightStamina,
            isFightOver, winner,
            roundLog: [...prevFightData.roundLog, ...roundEvents], // Append new events for this round
            isProcessingRoundEvents: true, // Indicate that these events are ready for UI
            uiReadyForNextEvent: false, // UI should consume these events now
        };
    });
  }, []);

  const getAvailableOpponents = useCallback(() => {
    const currentRankIndex = RANKS.indexOf(playerStats.rank);
    return OPPONENTS.filter(op => {
        const opponentRequiredRankIndex = op.rankRequired ? RANKS.indexOf(op.rankRequired) : -1;
        
        // Allow fighting opponents whose required rank is one above current, or any if player is max rank.
        // Also allow fighting opponents of same or lower rank.
        if (currentRankIndex === RANKS.length - 1) return true; // Max rank can fight anyone
        if (opponentRequiredRankIndex <= currentRankIndex + 1) return true; 

        return false;
    });
  }, [playerStats.rank]);

  const initiateFight = useCallback((opponent: Opponent) => {
    if (gamePhase === GamePhase.IN_TRAINING_CAMP) {
        addLog("훈련 캠프 중에는 경기를 할 수 없습니다.", "error"); return;
    }
    if (playerStats.currentHealth < 30) {
        addLog("건강이 너무 낮아 경기를 치를 수 없습니다. 휴식이 필요합니다.", "error"); return;
    }
    if (playerStats.currentStamina < 20) {
        addLog("스태미나가 너무 낮아 경기를 치를 수 없습니다. 휴식이 필요합니다.", "error"); return;
    }
    setCurrentOpponent(opponent);
    setGamePhase(GamePhase.FIGHTING);
    addLog(`${playerStats.playerName}(${playerStats.rank}) vs ${opponent.name} - 경기 준비 중...`, "fight");
    const initialPlayerSnapshot: PlayerSnapshot = {
        strength: playerStats.strength, speed: playerStats.speed, technique: playerStats.technique,
        health: playerStats.health, stamina: playerStats.stamina, rank: playerStats.rank,
        playerName: playerStats.playerName, traits: [...playerStats.traits],
    };
    setFightState({ // Reset fight state completely
        opponent: opponent, playerSnapshot: initialPlayerSnapshot,
        playerFightHealth: playerStats.currentHealth, playerFightStamina: playerStats.currentStamina,
        opponentFightHealth: opponent.stats.health, opponentFightStamina: opponent.stats.stamina,
        currentRound: 0, // Will be incremented to 1 by processNextFightAction before _processSingleFightRound
        roundLog: [], 
        fullFightTranscript: [],
        isFightOver: false, winner: null,
        isProcessingRoundEvents: false, 
        uiReadyForNextEvent: true, // Ready to start the first round processing immediately
    });
  }, [playerStats, addLog, gamePhase]);

  const consumeNextFightDisplayEvent = useCallback(() => {
    let eventToDisplay: FightEvent | null = null;
    setFightState(prev => {
        if (prev.roundLog.length > 0) {
            eventToDisplay = prev.roundLog[0];
            const newRoundLog = prev.roundLog.slice(1);
            const newFullTranscript = prev.fullFightTranscript.find(e => e.id === eventToDisplay!.id) ? prev.fullFightTranscript : [...prev.fullFightTranscript, eventToDisplay!];
            return {
                ...prev, 
                roundLog: newRoundLog,
                fullFightTranscript: newFullTranscript,
                isProcessingRoundEvents: newRoundLog.length > 0, // Still processing if more logs for this step
                uiReadyForNextEvent: newRoundLog.length === 0, // UI ready for next action if all logs for this step consumed
            };
        }
        // If roundLog is empty, it means UI is ready for next game logic step (next round or fight end)
        return { ...prev, isProcessingRoundEvents: false, uiReadyForNextEvent: true }; 
    });
    return eventToDisplay;
  }, []);

  const processNextFightAction = useCallback(() => {
    setFightState(prev => {
        if (prev.isFightOver) {
            if (!prev.isProcessingRoundEvents && prev.roundLog.length === 0) { // All events for the fight conclusion have been displayed
                setPlayerStats(currentPStats => {
                    let newStats = { ...currentPStats, currentHealth: prev.playerFightHealth, currentStamina: prev.playerFightStamina };
                    let reputationChange = 0, prizeMoney = 0, techniqueGain = 0;

                    if (prev.winner === "player") {
                        newStats.wins += 1;
                        const baseRepGain = REPUTATION_GAIN_WIN_DEFAULT;
                        const playerRankIndex = RANKS.indexOf(prev.playerSnapshot!.rank);
                        const rankBonusRep = playerRankIndex * REPUTATION_GAIN_WIN_RANK_BONUS;
                        
                        const opponentRankIndex = prev.opponent?.rankRequired ? RANKS.indexOf(prev.opponent.rankRequired) : -1;
                        const underdogBonusRep = (opponentRankIndex > -1 && playerRankIndex > -1 && opponentRankIndex > playerRankIndex) 
                                                ? REPUTATION_GAIN_WIN_RANK_BONUS * (opponentRankIndex - playerRankIndex) 
                                                : 0;
                        
                        reputationChange = baseRepGain + rankBonusRep + underdogBonusRep;
                        newStats.reputation = Math.max(0, newStats.reputation + reputationChange);
                        
                        prizeMoney = 50 + (playerRankIndex * 50) + (underdogBonusRep > 0 ? (underdogBonusRep * 20) : 0);
                        newStats.funds += prizeMoney;
                        techniqueGain = 1; 
                        newStats.technique = Math.min(MAX_STAT_VALUE, newStats.technique + techniqueGain);

                        addLog(`승리! 평판 +${reputationChange}, 상금 $${prizeMoney}, 기술 +${techniqueGain}.`, "success");
                        setFightResult("승리");
                        setModalRewards(`보상: 명성 +${reputationChange}, 상금 $${prizeMoney}, 기술 +${techniqueGain}`);
                        setModalTitle(`${prev.opponent?.name} 와(과)의 경기`);
                    } else { 
                        newStats.losses += 1;
                        reputationChange = -REPUTATION_LOSS_DEFAULT;
                        newStats.reputation = Math.max(0, newStats.reputation + reputationChange);
                        addLog(`패배... 평판 ${reputationChange}.`, "error");
                        setFightResult("패배");
                        setModalRewards(`평판 ${reputationChange}`);
                        setModalTitle(`${prev.opponent?.name} 와(과)의 경기`);
                    }

                    if (newStats.currentHealth <= 0 && prev.winner === "opponent") {
                        addLog("선수가 경기 중 심각한 부상으로 은퇴합니다... 게임 오버.", "error");
                        // Game over state will be set by closeFightModal or a dedicated effect if health hits 0
                    }
                    return newStats;
                });

                setFightLogForModal(prev.fullFightTranscript.map(e => e.message));
                setIsModalOpen(true);
                setGamePhase(GamePhase.FIGHT_RESULT);
            }
            return { ...prev, uiReadyForNextEvent: false, isProcessingRoundEvents: false }; // Prevent further fight processing
        }

        // If fight is NOT over, and UI is ready for next action (either new round or processing current round events)
        if (prev.uiReadyForNextEvent && !prev.isProcessingRoundEvents) {
             if (prev.currentRound < MAX_FIGHT_ROUNDS || prev.currentRound === 0) { // Allow first round (currentRound 0 -> 1)
                const nextRoundNumber = prev.currentRound + 1;
                // Immediately call _processSingleFightRound for the new round
                // This will populate roundLog and set isProcessingRoundEvents to true / uiReadyForNextEvent to false
                // No need to return a new state here that sets these flags, _processSingleFightRound does it.
                // _processSingleFightRound(); // This was a direct call, but it's better to trigger via useEffect or return new state.
                
                // Let's make _processSingleFightRound be triggered by useEffect watching currentRound & !isProcessingRoundEvents
                // So, here we just update the round number and flags.
                 return {
                    ...prev,
                    currentRound: nextRoundNumber,
                    isProcessingRoundEvents: false, // This will be set to true by _processSingleFightRound
                    uiReadyForNextEvent: true,     // This allows the useEffect for _processSingleFightRound to run
                    roundLog: []                   // Clear previous round's log from processing queue
                };
            } else { 
                 // Max rounds reached, but fight not over by K.O. -> Handled by _processSingleFightRound (judgment)
                 // This path should ideally not be hit if judgment logic is in _processSingleFightRound correctly.
                 // If it is, implies judgment needs to be triggered.
                 return {...prev, isFightOver: true, uiReadyForNextEvent: false}; // Force end if logic flaw
            }
        }
        return prev; 
    });
  }, [addLog]); // Removed checkRankUp, advanceWeek as they are in closeFightModal


  // This useEffect will trigger when currentRound changes and we're ready to process it.
  useEffect(() => {
    if (gamePhase === GamePhase.FIGHTING && !fightState.isFightOver && fightState.currentRound > 0 && fightState.uiReadyForNextEvent && !fightState.isProcessingRoundEvents && fightState.roundLog.length === 0) {
        _processSingleFightRound();
    }
  }, [gamePhase, fightState.currentRound, fightState.isFightOver, fightState.uiReadyForNextEvent, fightState.isProcessingRoundEvents, fightState.roundLog.length, _processSingleFightRound]);


  const closeFightModal = useCallback(() => {
    setIsModalOpen(false);
    setModalTitle("");
    setFightLogForModal([]);
    setModalRewards("");
    
    if (playerStats.currentHealth <= 0) {
        setGamePhase(GamePhase.GAME_OVER);
    } else {
        setGamePhase(GamePhase.MENU);
        if (fightResult === "승리") {
            checkRankUp();
        }
        advanceWeek();
    }
    setFightResult(""); // Reset for next fight
    setFightState(INITIAL_FIGHT_STATE); // Fully reset fight state
  }, [fightResult, checkRankUp, advanceWeek, addLog, playerStats.currentHealth]);


  const handleRestart = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    setPlayerStats(INITIAL_PLAYER_STATS);
    setGameWeek(1);
    setLogs([]);
    setCurrentOpponent(null);
    setGamePhase(GamePhase.PLAYER_SETUP);
    setFightLogForModal([]);
    setFightResult("");
    setIsModalOpen(false);
    setModalTitle("");
    setModalRewards("");
    setCurrentNewsMessage(null);
    setActiveTrainingCamp(null);
    setTrainingCampWeeksRemaining(0);
    setFightState(INITIAL_FIGHT_STATE);
    setIsAutoPilotEnabled(false);
  }, []);

  const chartData = [
    { name: STAT_NAMES_KOREAN.strength, value: playerStats.strength, maxValue: MAX_STAT_VALUE },
    { name: STAT_NAMES_KOREAN.speed, value: playerStats.speed, maxValue: MAX_STAT_VALUE },
    { name: STAT_NAMES_KOREAN.stamina, value: playerStats.stamina, maxValue: MAX_STAT_VALUE },
    { name: STAT_NAMES_KOREAN.technique, value: playerStats.technique, maxValue: MAX_STAT_VALUE },
    { name: STAT_NAMES_KOREAN.health, value: playerStats.health, maxValue: MAX_HEALTH },
  ] as ChartDataItem[];

  const handleSignSponsorship = useCallback((sponsorshipId: string) => {
    const sponsorship = AVAILABLE_SPONSORSHIPS.find(s => s.id === sponsorshipId);
    if (!sponsorship) {
        addLog("존재하지 않는 스폰서 계약입니다.", "error"); return;
    }
    if (playerStats.reputation < sponsorship.reputationRequired) {
        addLog("평판이 부족하여 이 계약을 체결할 수 없습니다.", "error"); return;
    }
    if (playerStats.completedSponsorshipIds.includes(sponsorship.id)) {
         addLog("이미 완료한 계약입니다.", "error"); return;
    }
     if (playerStats.activeSponsorships.some(s => s.id === sponsorship.id)) {
         addLog("이미 진행중인 계약입니다.", "error"); return;
    }

    const MAX_ACTIVE_WEEKLY_CONTRACTS = 2;
    if (sponsorship.benefitType === 'weekly' && playerStats.activeSponsorships.filter(s => s.benefitType === 'weekly').length >= MAX_ACTIVE_WEEKLY_CONTRACTS) {
        addLog(`주간 계약은 동시에 ${MAX_ACTIVE_WEEKLY_CONTRACTS}개까지만 가능합니다.`, "error"); return;
    }

    setPlayerStats(prev => {
        let newStats = { ...prev };
        if (sponsorship.benefitType === 'one_time') {
            newStats.funds += sponsorship.amount;
            newStats.completedSponsorshipIds = [...newStats.completedSponsorshipIds, sponsorship.id];
            addLog(`${sponsorship.name} 계약 체결! 일시금 $${sponsorship.amount}를 받았습니다.`, "finance");
        } else { // weekly
            const activeContract: ActiveSponsorship = { ...sponsorship, weeksRemaining: sponsorship.durationWeeks! };
            newStats.activeSponsorships = [...newStats.activeSponsorships, activeContract];
            addLog(`${sponsorship.name} 주간 계약 체결! ${sponsorship.durationWeeks}주 동안 주간 $${sponsorship.amount}를 받습니다.`, "finance");
        }
        return newStats;
    });
    advanceWeek();
  }, [playerStats, addLog, advanceWeek]);

  const availableSponsorships = AVAILABLE_SPONSORSHIPS.filter(s => 
      !playerStats.completedSponsorshipIds.includes(s.id) && 
      !playerStats.activeSponsorships.some(active => active.id === s.id)
  );

  const availableTrainingCamps = TRAINING_CAMPS.filter(camp => {
    if (camp.reputationRequired && playerStats.reputation < camp.reputationRequired) return false;
    // Add other conditions if necessary, e.g. player rank
    return true;
  });

  const startTrainingCamp = useCallback((campId: string) => {
    if (activeTrainingCamp) {
        addLog("이미 다른 훈련 캠프에 참가 중입니다.", "error"); return;
    }
    const camp = TRAINING_CAMPS.find(c => c.id === campId);
    if (!camp) {
        addLog("존재하지 않는 훈련 캠프입니다.", "error"); return;
    }
    if (playerStats.funds < camp.cost) {
        addLog("자금이 부족하여 이 캠프에 참가할 수 없습니다.", "error"); return;
    }
    if (camp.reputationRequired && playerStats.reputation < camp.reputationRequired) {
        addLog("평판이 부족하여 이 캠프에 참가할 수 없습니다.", "error"); return;
    }

    setPlayerStats(prev => ({ ...prev, funds: prev.funds - camp.cost }));
    setActiveTrainingCamp(camp);
    setTrainingCampWeeksRemaining(camp.durationWeeks);
    setGamePhase(GamePhase.IN_TRAINING_CAMP);
    addLog(`${camp.name} 훈련 캠프 참가! 비용: $${camp.cost}, 기간: ${camp.durationWeeks}주.`, "camp");
    advanceWeek(); // Advance week to start the camp
  }, [playerStats, activeTrainingCamp, addLog, advanceWeek]);

  const toggleAutoPilot = useCallback(() => {
    setIsAutoPilotEnabled(prev => {
        const newState = !prev;
        if (newState) {
            addLog("자동 진행 모드가 활성화되었습니다. CPU가 게임을 제어합니다.", "info");
        } else {
            addLog("자동 진행 모드가 비활성화되었습니다. 수동으로 제어합니다.", "info");
            if (autoPilotActionTimeoutRef.current) {
                clearTimeout(autoPilotActionTimeoutRef.current);
                autoPilotActionTimeoutRef.current = null;
            }
        }
        return newState;
    });
  }, [addLog]);

  // Auto-pilot action execution
  useEffect(() => {
    const clearAutoPilotTimer = () => {
        if (autoPilotActionTimeoutRef.current) {
            clearTimeout(autoPilotActionTimeoutRef.current);
            autoPilotActionTimeoutRef.current = null;
        }
    };

    if (isAutoPilotEnabled && gamePhase === GamePhase.MENU && !activeTrainingCamp) {
      autoPilotActionTimeoutRef.current = window.setTimeout(() => {
        // CPU Decision Logic
        addLog("자동 진행: CPU 행동 결정 중...", "info");

        // 1. Recovery if critical
        if (playerStats.currentHealth < playerStats.health * 0.4 || playerStats.currentStamina < playerStats.stamina * 0.2) {
            const restOption = TRAINING_OPTIONS.find(opt => opt.id === TrainingType.REST);
            if (restOption) {
                addLog("자동 진행: 체력/스태미나 회복을 위해 '휴식'을 선택합니다.", "info");
                handleTraining(TrainingType.REST);
                return;
            }
        }

        // 2. Training Camps if affordable and beneficial
        const bestCamp = availableTrainingCamps
            .filter(camp => playerStats.funds >= camp.cost && (!camp.traitAwarded || !playerStats.traits.includes(camp.traitAwarded)))
            .sort((a,b) => (b.effects.reduce((sum,eff) => sum + eff.value,0) + (b.traitAwarded ? 20 : 0)) - (a.effects.reduce((sum,eff) => sum + eff.value,0) + (a.traitAwarded ? 20 : 0)))[0];
        
        if (bestCamp) {
            addLog(`자동 진행: ${bestCamp.name} 캠프 참가를 결정합니다.`, "info");
            startTrainingCamp(bestCamp.id);
            return;
        }
        
        // 3. Fight if strong enough and opponent available
        const potentialOpponents = getAvailableOpponents().filter(op => {
            const playerAdvantage = (playerStats.strength + playerStats.speed + playerStats.technique) - (op.stats.strength + op.stats.speed + op.stats.technique);
            return playerAdvantage > -15; // Don't pick fights that are too hard
        }).sort((a,b) => (a.stats.strength + a.stats.speed) - (b.stats.strength + b.stats.speed)); // Pick weaker available opponents first

        if (playerStats.currentHealth >= 60 && playerStats.currentStamina >= 50 && potentialOpponents.length > 0) {
            const opponentToFight = potentialOpponents[0];
             addLog(`자동 진행: ${opponentToFight.name} 선수와 경기를 시작합니다.`, "info");
            initiateFight(opponentToFight);
            return;
        }

        // 4. Sponsorships
        const oneTimeSponsors = availableSponsorships.filter(s => s.benefitType === 'one_time' && playerStats.reputation >= s.reputationRequired).sort((a,b) => b.amount - a.amount);
        const weeklySponsors = availableSponsorships.filter(s => s.benefitType === 'weekly' && playerStats.reputation >= s.reputationRequired && playerStats.activeSponsorships.filter(as => as.benefitType === 'weekly').length < 2).sort((a,b) => b.amount - a.amount);

        if (playerStats.funds < 200 && oneTimeSponsors.length > 0) {
            addLog(`자동 진행: 자금 확보를 위해 ${oneTimeSponsors[0].name} 일회성 계약을 체결합니다.`, "info");
            handleSignSponsorship(oneTimeSponsors[0].id);
            return;
        }
        if (weeklySponsors.length > 0) {
            addLog(`자동 진행: ${weeklySponsors[0].name} 주간 계약을 체결합니다.`, "info");
            handleSignSponsorship(weeklySponsors[0].id);
            return;
        }

        // 5. Regular Training (pick lowest stat or random if all are similar)
        const statsToTrain = (['strength', 'speed', 'technique', 'stamina'] as const)
            .map(stat => ({ stat, value: playerStats[stat] }))
            .sort((a, b) => a.value - b.value);
        
        let trainingToPick: TrainingType | null = null;
        if (statsToTrain[0].stat === 'strength') trainingToPick = TrainingType.WEIGHT_LIFTING;
        else if (statsToTrain[0].stat === 'speed') trainingToPick = TrainingType.ROADWORK;
        else if (statsToTrain[0].stat === 'technique') trainingToPick = TrainingType.SANDBAG;
        else if (statsToTrain[0].stat === 'stamina') trainingToPick = TrainingType.ROADWORK; // Roadwork also boosts max stamina

        // Prefer sparring if stats are relatively balanced or high
        const avgStat = (playerStats.strength + playerStats.speed + playerStats.technique) / 3;
        if (avgStat > 30 && Math.random() < 0.3) trainingToPick = TrainingType.SPARRING;


        if (!trainingToPick || playerStats.currentStamina < TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!.staminaCost) {
            // Fallback if chosen training is not possible (e.g. stamina)
            const possibleTrainings = TRAINING_OPTIONS.filter(opt => opt.id !== TrainingType.REST && playerStats.currentStamina >= opt.staminaCost);
            if(possibleTrainings.length > 0) {
                trainingToPick = possibleTrainings[Math.floor(Math.random() * possibleTrainings.length)].id;
            } else {
                 trainingToPick = TrainingType.REST; // Last resort
            }
        }
        
        const selectedTrainingOption = TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!;
        addLog(`자동 진행: ${selectedTrainingOption.name} 훈련을 선택합니다.`, "info");
        handleTraining(selectedTrainingOption.id);

      }, AUTO_PILOT_ACTION_DELAY_MS);
    } else {
      clearAutoPilotTimer();
    }
    return clearAutoPilotTimer;
  }, [isAutoPilotEnabled, gamePhase, playerStats, gameWeek, activeTrainingCamp, addLog, handleTraining, initiateFight, getAvailableOpponents, handleSignSponsorship, startTrainingCamp, availableTrainingCamps, availableSponsorships]);


  return {
    playerStats, gameWeek, logs, setPlayerName, handleTraining, initiateFight,
    currentOpponent, gamePhase, fightState, consumeNextFightDisplayEvent, processNextFightAction,
    fightResult, isModalOpen, closeFightModal, modalTitle, modalRewards, fightLogForModal,
    chartData, getAvailableOpponents, handleRestart,
    handleSignSponsorship, availableSponsorships, currentNewsMessage,
    availableTrainingCamps, activeTrainingCamp, trainingCampWeeksRemaining, startTrainingCamp,
    isAutoPilotEnabled, toggleAutoPilot, addLog
  };
};

export default useGameLogic;
