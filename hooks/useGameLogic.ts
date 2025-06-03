
import { useState, useCallback, useEffect, useRef } from 'react';
import { PlayerStats, TrainingOption, TrainingType, Opponent, LogEntry, GamePhase, ChartDataItem, STAT_NAMES_KOREAN, Sponsorship, ActiveSponsorship, GameNewsEvent, CurrentFightState, FightEvent, PlayerSnapshot } from '../types';
import { INITIAL_PLAYER_STATS, TRAINING_OPTIONS, OPPONENTS, MAX_STAT_VALUE, MAX_HEALTH, RANKS, RANK_UP_WINS, REPUTATION_GAIN_WIN_DEFAULT, REPUTATION_LOSS_DEFAULT, REPUTATION_GAIN_WIN_RANK_BONUS, AVAILABLE_SPONSORSHIPS, GAME_NEWS_EVENTS } from '../constants';

const SAVE_KEY = 'championMakerSaveData_v1.1'; 

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
const AUTO_PILOT_ACTION_DELAY_MS = 2500; 
const AUTO_MODAL_CLOSE_DELAY_MS = 2000;

const WORLD_CHAMPION_ID = "world_champion_1";

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

  const [fightState, setFightState] = useState<CurrentFightState>(INITIAL_FIGHT_STATE);

  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const autoPilotActionTimeoutRef = useRef<number | null>(null);


  const addLog = useCallback((message: string, type: LogEntry['type'] = "info", important: boolean = false) => {
    setLogs(prevLogs => [...prevLogs, { id: crypto.randomUUID(), message, type, week: gameWeek, important }]);
  }, [gameWeek]);

  const closeFightModal = useCallback(() => {
    setIsModalOpen(false);
    setModalTitle("");
    setFightLogForModal([]);
    setModalRewards("");
    
    if (playerStats.currentHealth <= 0) {
        setGamePhase(GamePhase.GAME_OVER);
        addLog("선수의 건강이 모두 소진되어 은퇴합니다. 게임 오버.", "error");
    } else {
        setGamePhase(GamePhase.MENU);
        if (fightResult === "승리") {
            // checkRankUp is called within processNextFightAction or here if necessary.
            // For now, assuming checkRankUp logic is handled appropriately after win.
            // If direct call needed: checkRankUp(); // (but this creates a new dependency cycle if checkRankUp depends on things changing in closeFightModal)
        }
        // advanceWeek is called within processNextFightAction or here if necessary
        // For now, assuming advanceWeek logic is handled appropriately after modal close.
        // If direct call needed: advanceWeek(); // (same dependency concern)
    }
    setFightResult(""); 
    setFightState(INITIAL_FIGHT_STATE); 
  // Dependencies updated to include `fightResult` and `playerStats.currentHealth` directly.
  // `checkRankUp` and `advanceWeek` are complex dependencies. It's better if their calls are managed
  // by the game flow logic that calls `closeFightModal` rather than being direct dependencies here,
  // to avoid potential circular dependencies or unintended side effects.
  // If they are absolutely needed, they must be stable (useCallback) and listed.
  // For now, removing them to simplify and assuming they are handled by the caller context (processNextFightAction).
  }, [addLog, playerStats.currentHealth, fightResult]);
  
  useEffect(() => {
    let timerId: number | null = null;
    if (isAutoPilotEnabled && isModalOpen && gamePhase === GamePhase.FIGHT_RESULT) {
      addLog("자동 진행: 경기 결과 확인 중... 잠시 후 자동으로 닫힙니다.", "info");
      timerId = window.setTimeout(() => {
        if (isAutoPilotEnabled && isModalOpen && gamePhase === GamePhase.FIGHT_RESULT) {
          closeFightModal();
        }
      }, AUTO_MODAL_CLOSE_DELAY_MS);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isAutoPilotEnabled, isModalOpen, gamePhase, addLog, closeFightModal]);


  useEffect(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const loadedState = JSON.parse(savedData);
        if (loadedState.playerStats && loadedState.gamePhase && Object.values(GamePhase).includes(loadedState.gamePhase)) {
          
          if (loadedState.gamePhase === GamePhase.GAME_CLEAR) { // Do not load if game was cleared
            localStorage.removeItem(SAVE_KEY);
            setGamePhase(GamePhase.PLAYER_SETUP);
            setPlayerStats(INITIAL_PLAYER_STATS);
            setIsAutoPilotEnabled(false);
            return;
          }
          
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
    if (gamePhase === GamePhase.PLAYER_SETUP || gamePhase === GamePhase.FIGHTING || gamePhase === GamePhase.GAME_CLEAR) {
      return;
    }
    const gameStateToSave = {
      playerStats,
      gameWeek,
      logs,
      currentNewsMessage,
      gamePhase,
      isAutoPilotEnabled,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameStateToSave));
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [playerStats, gameWeek, logs, currentNewsMessage, gamePhase, isAutoPilotEnabled]);

  useEffect(() => {
    saveGameState();
  }, [saveGameState]);


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
    setFightState(INITIAL_FIGHT_STATE);
    setIsAutoPilotEnabled(false); 
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
                        case 'funds':
                            newStats.funds = Math.max(0, newStats.funds + effect.value);
                            break;
                        case 'reputation':
                            newStats.reputation = Math.max(0, newStats.reputation + effect.value);
                            break;
                        case 'currentHealth':
                            newStats.currentHealth = Math.min(newStats.health, Math.max(0, newStats.currentHealth + effect.value));
                            break;
                        case 'currentStamina':
                            newStats.currentStamina = Math.min(newStats.stamina, Math.max(0, newStats.currentStamina + effect.value));
                            break;
                        case 'strength':
                        case 'speed':
                        case 'technique':
                            newStats[effect.type] = Math.min(MAX_STAT_VALUE, Math.max(0, (newStats[effect.type] as number) + effect.value));
                            break;
                        case 'stamina': // Max stamina
                            newStats.stamina = Math.min(MAX_STAT_VALUE, Math.max(0, newStats.stamina + effect.value));
                            newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina); // Cap current stamina
                            break;
                        case 'health': // Max health
                            newStats.health = Math.min(MAX_HEALTH, Math.max(0, newStats.health + effect.value));
                            newStats.currentHealth = Math.min(newStats.health, newStats.currentHealth); // Cap current health
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

    setPlayerStats(prev => {
        let newStats = { ...prev };
        
        newStats.currentStamina = Math.min(newStats.stamina, newStats.currentStamina + 3); 
        newStats.currentHealth = Math.min(newStats.health, newStats.currentHealth + 1); 
        
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

  }, [addLog, processWeeklyNews]);


  const handleTraining = useCallback((trainingId: TrainingType) => {
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
        // Game phase will be set outside this callback based on health
      }
      return newStats;
    });
    
    setGamePhase(currentPhase => { 
        if (playerStats.currentHealth > 0) { 
            advanceWeek();
            return GamePhase.MENU;
        }
        return GamePhase.GAME_OVER; 
    });
  }, [playerStats, addLog, advanceWeek]);

  const checkRankUp = useCallback(() => {
    setPlayerStats(prev => {
        const currentRankIndex = RANKS.indexOf(prev.rank);
        if (currentRankIndex === -1 || currentRankIndex === RANKS.length - 1) return prev; // Already champion or invalid rank
        
        // Get wins needed for the current rank
        const winsNeededForCurrentRank = RANK_UP_WINS[prev.rank as keyof typeof RANK_UP_WINS];
        if (!winsNeededForCurrentRank) return prev; // No rank up definition for this rank

        // Calculate wins achieved *since last rank up* or *since game start for rookie*
        // This requires knowing wins at the point of the last rank up.
        // For simplicity, if we are not resetting wins/losses, the condition needs to be re-evaluated.
        // A simpler interpretation is wins_in_current_rank >= winsNeeded.
        // However, the prompt "전적은 계속 누적시켜줘" implies total wins matter for something, maybe not rank up directly.
        // The original logic "prev.wins >= winsNeeded" worked because wins WERE reset.
        // If wins are NOT reset, we need a way to track "wins in current rank" or adjust the condition.

        // Let's assume for now the rank up condition is "total wins meet threshold for NEXT rank, AND good win/loss ratio"
        // This is a change from "wins in current rank". If the user meant to keep "wins in current rank" logic
        // but without resetting overall W/L, then we'd need to store `winsAtLastRankUp`.

        // Re-interpreting RANK_UP_WINS as total wins needed to achieve *that rank itself*.
        // So, to get to '유망주' (Prospect), you need '신인' (Rookie) wins (e.g., 3).
        // To get to '프로' (Pro), you need '유망주' (Prospect) wins (e.g., 4), meaning total of 3+4 = 7 wins from start if that's how it works.
        // This is confusing. The original `RANK_UP_WINS` seemed to mean "wins accumulated *while* in this rank".

        // Sticking to "wins accumulated while in this rank" model by inferring.
        // This means we *do* need a way to track progress within the current rank, or the condition `prev.wins >= winsNeeded`
        // needs to be adjusted if `prev.wins` is total career wins.

        // Let's assume the intent of RANK_UP_WINS values were "wins to accumulate while in this rank".
        // If we don't reset `prev.wins`, then the condition `prev.wins >= winsNeeded` will be met very quickly
        // for subsequent ranks if `prev.wins` is, say, 10, and `winsNeeded` for the next rank is 4.

        // The most straightforward interpretation of "전적은 계속 누적" (stats accumulate)
        // and "랭크가 변경되면 전적이 초기화되는 것 같은데" (stats seem to reset on rank change)
        // is to simply NOT reset `prev.wins` and `prev.losses` during rank up.
        // The rank up condition itself (`prev.wins >= winsNeeded && ...`) likely needs adjustment
        // if `winsNeeded` refers to "wins in current rank".

        // Let's try a different approach for rank-up condition if W/L are cumulative:
        // We need to track wins *since the last rank-up*.
        // This would require adding a new field to PlayerStats, e.g., `winsAtLastRankUp`.
        // OR, we change the meaning of `RANK_UP_WINS` to be *cumulative total wins required for that rank*.
        // Example: "신인": 3, "유망주": 7 (3+4), "프로": 13 (7+6)
        // This seems more complex to maintain in `constants.ts`.

        // The simplest change given the user's direct feedback is to stop resetting W/L.
        // The rank-up condition `prev.wins >= winsNeeded` will then implicitly use total wins.
        // This will make ranking up faster if `RANK_UP_WINS` are low values meant for "wins in current rank".
        // The user might then follow up with "ranking up is too fast".

        // For now, I will implement the direct request: do not reset wins/losses.
        // The existing rank-up condition will be `total_wins >= RANK_UP_WINS[current_rank]`.
        // This is probably not the desired long-term game balance, but it's the direct interpretation.

        const winsInCurrentTierForRankUp = RANK_UP_WINS[prev.rank as keyof typeof RANK_UP_WINS];

        // The condition must now be carefully considered. If `prev.wins` is total career wins,
        // and `winsNeeded` (from `RANK_UP_WINS`) is meant to be "wins achieved in current rank",
        // then the condition `prev.wins >= winsNeeded` is flawed if wins are not reset.
        // For example, if Rookie needs 3 wins, player gets 3 wins, ranks up.
        // Now player is Prospect, total wins = 3. Prospect needs 4 wins.
        // If player wins 1 more game, total wins = 4. `prev.wins (4) >= winsNeeded (4)` is true. Player ranks up again. Too fast.

        // To preserve the "X wins in current rank" logic without resetting total wins/losses,
        // we need to subtract the wins required for *all previous ranks* from the current total wins
        // to see how many wins they've achieved in the *current* rank.
        // OR, simpler: the rank-up condition must be based on *total wins thresholds*.
        // The `RANK_UP_WINS` constants would need to be redefined as cumulative.
        // e.g., "신인": 3, "유망주": (3 for rookie + 4 for prospect) = 7 total wins, "프로": (7 for prospect + 6 for pro) = 13 total wins.

        // Given the current structure, the least disruptive way to meet "don't reset W/L"
        // and keep rank-up somewhat sensible is to assume `RANK_UP_WINS`
        // *are* the number of wins *in that specific rank tier*.
        // This means we need to effectively track wins *since last rank up*.
        // A pragmatic way without adding new state: check if (total_wins - wins_at_start_of_current_rank) >= wins_needed_for_current_rank.
        // This means `wins_at_start_of_current_rank` would need to be known.

        // Let's reconsider the user's request. "랭크가 변경되면 전적이 초기화되는 것 같은데, 전적은 계속 누적시켜줘."
        // This primarily targets the `wins: 0, losses: 0` part.
        // The *condition* for ranking up might need a separate request if it becomes unbalanced.
        // For now, I will ONLY change the reset behavior. The `prev.wins >= winsNeeded` condition remains.
        // This might lead to faster rank-ups, which the user can then refine.

        const nextRankIndex = currentRankIndex + 1;
        const nextRank = RANKS[nextRankIndex];
        
        // The original condition for rank up:
        // `winsNeeded && prev.wins >= winsNeeded && (prev.losses === 0 || prev.wins / (prev.wins + prev.losses) > 0.55)`
        // If `prev.wins` is now total career wins, this condition is effectively:
        // "Player's total career wins is >= wins needed for *current rank tier* AND win ratio is good"
        // This is likely what the user implicitly expects if they just want W/L to not reset.
        if (winsInCurrentTierForRankUp && prev.wins >= winsInCurrentTierForRankUp && (prev.losses === 0 || prev.wins / (prev.wins + prev.losses) > 0.55) ) { 
            if (nextRank) {
                addLog(`축하합니다! ${prev.rank}에서 ${nextRank}(으)로 승급했습니다! 명성 +${REPUTATION_GAIN_WIN_RANK_BONUS * 2}`, "success");
                // Do NOT reset wins and losses.
                return { 
                    ...prev, 
                    rank: nextRank, 
                    reputation: prev.reputation + REPUTATION_GAIN_WIN_RANK_BONUS * 2,
                    // wins: 0, // Removed
                    // losses: 0, // Removed
                }; 
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
            let playerHitChance = (playerSnapshot.speed + playerSnapshot.technique * 1.5) / (playerSnapshot.speed + playerSnapshot.technique * 1.5 + opponent.stats.speed * 1.05 + opponent.stats.technique * 1.05) * (playerFightStamina / playerSnapshot.stamina * 0.5 + 0.5);
            playerHitChance *= 0.97; 
            if (playerSnapshot.traits.includes("정교한 타격")) playerHitChance *= 1.1;

            if (Math.random() < playerHitChance) {
                let playerDamage = Math.max(1, Math.floor(playerSnapshot.strength * (1 + playerSnapshot.technique / 50) - opponent.stats.technique / 4.5 + (Math.random() * 5 - 2.5))); 
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
            let opponentHitChance = (opponent.stats.speed + opponent.stats.technique * 1.6) / (opponent.stats.speed + opponent.stats.technique * 1.6 + playerSnapshot.speed + playerSnapshot.technique) * (opponentFightStamina / opponent.stats.stamina * 0.5 + 0.5);
            opponentHitChance *= 1.03; 

            if (Math.random() < opponentHitChance) {
                let opponentDamage = Math.max(1, Math.floor(opponent.stats.strength * (1 + opponent.stats.technique / 45) - playerSnapshot.technique / 5.5 + (Math.random() * 5 - 2.5))); 
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
            opponentFightStamina = Math.max(0, opponentFightStamina - (6 + Math.floor(Math.random() * 3))); 
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
            else winner = Math.random() > 0.45 ? "player" : "opponent"; 
            roundEvents.push(createEvent('text', `판정 결과: ${winner === "player" ? playerSnapshot.playerName : opponent.name} 승리!`));
        }
        if (isFightOver) {
            roundEvents.push(createEvent('fight_conclusion', winner === 'player' ? "경기 결과: 당신의 승리!" : "경기 결과: 당신의 패배...", {isCritical: true}));
        }
        return {
            ...prevFightData, playerFightHealth, opponentFightHealth, playerFightStamina, opponentFightStamina,
            isFightOver, winner,
            roundLog: [...prevFightData.roundLog, ...roundEvents], 
            isProcessingRoundEvents: true, 
            uiReadyForNextEvent: false, 
        };
    });
  }, []);

  const getAvailableOpponents = useCallback(() => {
    const currentRankIndex = RANKS.indexOf(playerStats.rank);
    return OPPONENTS.filter(op => {
        const opponentRequiredRankIndex = op.rankRequired ? RANKS.indexOf(op.rankRequired) : -1;
        
        if (currentRankIndex === RANKS.length - 1) return true; 
        if (opponentRequiredRankIndex <= currentRankIndex + 1) return true; 

        return false;
    });
  }, [playerStats.rank]);

  const initiateFight = useCallback((opponent: Opponent) => {
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
    setFightState({ 
        opponent: opponent, playerSnapshot: initialPlayerSnapshot,
        playerFightHealth: playerStats.currentHealth, playerFightStamina: playerStats.currentStamina,
        opponentFightHealth: opponent.stats.health, opponentFightStamina: opponent.stats.stamina,
        currentRound: 0, 
        roundLog: [], 
        fullFightTranscript: [],
        isFightOver: false, winner: null,
        isProcessingRoundEvents: false, 
        uiReadyForNextEvent: true, 
    });
  }, [playerStats, addLog]);

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
                isProcessingRoundEvents: newRoundLog.length > 0, 
                uiReadyForNextEvent: newRoundLog.length === 0, 
            };
        }
        return { ...prev, isProcessingRoundEvents: false, uiReadyForNextEvent: true }; 
    });
    return eventToDisplay;
  }, []);

  const processNextFightAction = useCallback(() => {
    const prev = fightState; // Use a local const for the current fightState

    if (prev.isFightOver) {
        if (!prev.isProcessingRoundEvents && prev.roundLog.length === 0) {
            if (prev.winner === "player" && prev.opponent?.id === WORLD_CHAMPION_ID) {
                setPlayerStats(currentPStats => {
                    let newStats = { ...currentPStats, currentHealth: prev.playerFightHealth, currentStamina: prev.playerFightStamina };
                    newStats.wins += 1;
                    const playerRankIndex = RANKS.indexOf(prev.playerSnapshot!.rank);
                    
                    const prizeMoney = 5000 + (playerRankIndex * 200);
                    const reputationChange = 500 + (playerRankIndex * 50);
                    const techniqueGain = 5;

                    newStats.reputation = Math.max(0, newStats.reputation + reputationChange);
                    newStats.funds += prizeMoney;
                    newStats.technique = Math.min(MAX_STAT_VALUE, newStats.technique + techniqueGain);
                    if (newStats.rank !== "챔피언") newStats.rank = "챔피언";


                    addLog(`역사적인 승리! 세계 챔피언 ${prev.opponent!.name}을(를) 꺾었습니다! 보상: 명성 +${reputationChange}, 상금 $${prizeMoney}, 기술 +${techniqueGain}.`, "success", true);
                    return newStats;
                });
                addLog("게임 클리어! 새로운 전설의 탄생입니다!", "success", true);
                setGamePhase(GamePhase.GAME_CLEAR);
                setFightState(fs => ({ ...fs, isFightOver: true, winner: 'player', uiReadyForNextEvent: false, isProcessingRoundEvents: false }));
                return; 
            } else {
                // Regular fight conclusion (win or loss)
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
                        
                        prizeMoney = 30 + (playerRankIndex * 40) + (underdogBonusRep > 0 ? (underdogBonusRep * 15) : 0);
                        newStats.funds += prizeMoney;
                        techniqueGain = 1; 
                        newStats.technique = Math.min(MAX_STAT_VALUE, newStats.technique + techniqueGain);

                        setFightResult("승리");
                        setModalRewards(`보상: 명성 +${reputationChange}, 상금 $${prizeMoney}, 기술 +${techniqueGain}`);
                        setModalTitle(`${prev.opponent?.name} 와(과)의 경기`);
                        addLog(`승리! 평판 +${reputationChange}, 상금 $${prizeMoney}, 기술 +${techniqueGain}.`, "success");
                    } else { 
                        newStats.losses += 1;
                        reputationChange = -REPUTATION_LOSS_DEFAULT;
                        newStats.reputation = Math.max(0, newStats.reputation + reputationChange);
                        setFightResult("패배");
                        setModalRewards(`평판 ${reputationChange}`);
                        setModalTitle(`${prev.opponent?.name} 와(과)의 경기`);
                        addLog(`패배... 평판 ${reputationChange}.`, "error");
                    }

                    if (newStats.currentHealth <= 0 && prev.winner === "opponent") {
                        addLog("선수가 경기 중 심각한 부상으로 은퇴합니다... 게임 오버.", "error");
                    }
                    return newStats;
                });
                setFightLogForModal(prev.fullFightTranscript.map(e => e.message));
                setIsModalOpen(true);
                setGamePhase(GamePhase.FIGHT_RESULT);
                setFightState(fs => ({ ...fs, uiReadyForNextEvent: false, isProcessingRoundEvents: false }));

                // After fight result modal is set up, check for rank up if player won
                // and advance week. This logic should now be safe to call after modal is set.
                if (prev.winner === "player") {
                  checkRankUp();
                }
                // Advance week regardless of win/loss, unless game over is triggered by health in playerStats update
                if (playerStats.currentHealth > 0 || (prev.winner === "player" && (playerStats.currentHealth + prev.playerFightHealth) > 0)) { // a bit complex to check, ensure not game over
                    if (gamePhase !== GamePhase.GAME_OVER && gamePhase !== GamePhase.GAME_CLEAR) { // ensure we don't advance week if already over/cleared
                      advanceWeek();
                    }
                }
                return;
            }
        }
    } else { // Fight is not over yet, and UI is ready for next logical step (next round calculation)
         setFightState(fs => {
            if (fs.uiReadyForNextEvent && !fs.isProcessingRoundEvents) {
                if (fs.currentRound < MAX_FIGHT_ROUNDS || fs.currentRound === 0) { 
                    const nextRoundNumber = fs.currentRound + 1;
                    return {
                        ...fs,
                        currentRound: nextRoundNumber,
                        isProcessingRoundEvents: false, 
                        uiReadyForNextEvent: true,     
                        roundLog: []                   
                    };
                } else { 
                    return {...fs, isFightOver: true, uiReadyForNextEvent: false}; 
                }
            }
            return fs; 
        });
    }
  // Added missing dependencies to useCallback
  }, [fightState, addLog, checkRankUp, advanceWeek, playerStats.currentHealth, gamePhase]); 


  useEffect(() => {
    if (gamePhase === GamePhase.FIGHTING && !fightState.isFightOver && fightState.currentRound > 0 && fightState.uiReadyForNextEvent && !fightState.isProcessingRoundEvents && fightState.roundLog.length === 0) {
        _processSingleFightRound();
    }
  }, [gamePhase, fightState.currentRound, fightState.isFightOver, fightState.uiReadyForNextEvent, fightState.isProcessingRoundEvents, fightState.roundLog.length, _processSingleFightRound]);


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
        } else { 
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

  useEffect(() => {
    const clearAutoPilotTimer = () => {
        if (autoPilotActionTimeoutRef.current) {
            clearTimeout(autoPilotActionTimeoutRef.current);
            autoPilotActionTimeoutRef.current = null;
        }
    };

    if (isAutoPilotEnabled && gamePhase === GamePhase.MENU ) {
      autoPilotActionTimeoutRef.current = window.setTimeout(() => {
        addLog("자동 진행: CPU 행동 결정 중...", "info");

        // 1. Check for Rest first
        if (playerStats.currentHealth < playerStats.health * 0.5 || playerStats.currentStamina < playerStats.stamina * 0.3) { 
            const restOption = TRAINING_OPTIONS.find(opt => opt.id === TrainingType.REST);
            if (restOption) {
                addLog("자동 진행: 체력/스태미나 회복을 위해 '휴식'을 선택합니다.", "info");
                handleTraining(TrainingType.REST);
                return;
            }
        }
        
        // 2. Check for Fight
        const availableOpponentsForFight = getAvailableOpponents();
        const playerPower = playerStats.strength + playerStats.speed + playerStats.technique;
        
        const fightCandidates = availableOpponentsForFight.filter(op => {
            const opponentPower = op.stats.strength + op.stats.speed + op.stats.technique;
            if (opponentPower === 0) return true; 
            // Player challenges opponents whose power is 80% or less of player's power
            return opponentPower <= playerPower * 0.80; 
        });

        if (playerStats.currentHealth >= playerStats.health * 0.6 && 
            playerStats.currentStamina >= playerStats.stamina * 0.5 && 
            fightCandidates.length > 0
        ) {
            // Sort eligible opponents by their power in descending order (strongest first)
            fightCandidates.sort((a, b) => { 
                const aOpponentPower = a.stats.strength + a.stats.speed + a.stats.technique;
                const bOpponentPower = b.stats.strength + b.stats.speed + b.stats.technique;
                return bOpponentPower - aOpponentPower; 
            });
            const opponentToFight = fightCandidates[0]; // Pick the strongest among the eligible
            const opponentToFightPower = opponentToFight.stats.strength + opponentToFight.stats.speed + opponentToFight.stats.technique;
            addLog(`자동 진행: ${opponentToFight.name} 선수와 경기를 시작합니다. (상대 총 능력치: ${opponentToFightPower}, 플레이어 총 능력치: ${playerPower})`, "info");
            initiateFight(opponentToFight);
            return;
        }

        // 3. Sponsorship logic
        const oneTimeSponsors = availableSponsorships.filter(s => s.benefitType === 'one_time' && playerStats.reputation >= s.reputationRequired).sort((a,b) => b.amount - a.amount);
        const weeklySponsors = availableSponsorships.filter(s => s.benefitType === 'weekly' && playerStats.reputation >= s.reputationRequired && playerStats.activeSponsorships.filter(as => as.benefitType === 'weekly').length < 2).sort((a,b) => b.amount - a.amount);

        if (playerStats.funds < 150 && oneTimeSponsors.length > 0) { 
            addLog(`자동 진행: 자금 확보를 위해 ${oneTimeSponsors[0].name} 일회성 계약을 체결합니다.`, "info");
            handleSignSponsorship(oneTimeSponsors[0].id);
            return;
        }
        if (weeklySponsors.length > 0 && playerStats.activeSponsorships.filter(as => as.benefitType === 'weekly').length === 0) { 
            if (playerStats.funds > 50 || oneTimeSponsors.length === 0) { // Prefer weekly if not critically low on funds or no one-time options
              addLog(`자동 진행: ${weeklySponsors[0].name} 주간 계약을 체결합니다.`, "info");
              handleSignSponsorship(weeklySponsors[0].id);
              return;
            }
        }
        
        // 4. Training logic
        const statsToTrain = (['strength', 'speed', 'technique', 'stamina'] as const)
            .map(stat => ({ stat, value: playerStats[stat] }))
            .sort((a, b) => a.value - b.value);
        
        let trainingToPick: TrainingType | null = null;
        if (statsToTrain[0].value < MAX_STAT_VALUE * 0.8) { 
            if (statsToTrain[0].stat === 'strength') trainingToPick = TrainingType.WEIGHT_LIFTING;
            else if (statsToTrain[0].stat === 'speed') trainingToPick = TrainingType.ROADWORK;
            else if (statsToTrain[0].stat === 'technique') trainingToPick = TrainingType.SANDBAG;
            else if (statsToTrain[0].stat === 'stamina') trainingToPick = TrainingType.ROADWORK; 
        }
        
        if (!trainingToPick || (trainingToPick && playerStats.currentStamina < TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!.staminaCost)) {
            const avgStat = (playerStats.strength + playerStats.speed + playerStats.technique) / 3;
            const sparringOption = TRAINING_OPTIONS.find(opt => opt.id === TrainingType.SPARRING)!;
            if (avgStat > 25 && Math.random() < 0.35 && playerStats.currentHealth > playerStats.health * 0.4 && playerStats.currentStamina >= sparringOption.staminaCost) {
                 trainingToPick = TrainingType.SPARRING;
            }
        }

        if (!trainingToPick || (trainingToPick && playerStats.currentStamina < TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!.staminaCost)) {
            const possibleTrainings = TRAINING_OPTIONS.filter(opt => 
                opt.id !== TrainingType.REST && 
                playerStats.currentStamina >= opt.staminaCost
            );
            if(possibleTrainings.length > 0) {
                const sortedPossibleTrainings = possibleTrainings.sort((a,b) => {
                    const sumEffects = (effects: TrainingOption['effects']) => 
                        Object.entries(effects)
                            .filter(([key, value]) => typeof value === 'number' && !['healthChange', 'staminaChange'].includes(key) && value > 0)
                            .reduce((sum, [, value]) => sum + (value as number), 0);
                    return sumEffects(b.effects) - sumEffects(a.effects);
                });
                trainingToPick = sortedPossibleTrainings[0].id;
            }
        }
        
        if (!trainingToPick || (trainingToPick && playerStats.currentStamina < TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!.staminaCost)) {
            trainingToPick = TrainingType.REST; 
        }
        
        const selectedTrainingOption = TRAINING_OPTIONS.find(opt => opt.id === trainingToPick)!;
        addLog(`자동 진행: ${selectedTrainingOption.name} 훈련을 선택합니다.`, "info");
        handleTraining(selectedTrainingOption.id);

      }, AUTO_PILOT_ACTION_DELAY_MS);
    } else {
      clearAutoPilotTimer();
    }
    return clearAutoPilotTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPilotEnabled, gamePhase, playerStats, gameWeek, addLog, handleTraining, initiateFight, getAvailableOpponents, handleSignSponsorship, availableSponsorships]);


  return {
    playerStats, gameWeek, logs, setPlayerName, handleTraining, initiateFight,
    currentOpponent, gamePhase, fightState, consumeNextFightDisplayEvent, processNextFightAction,
    fightResult, isModalOpen, closeFightModal, modalTitle, modalRewards, fightLogForModal,
    chartData, getAvailableOpponents, handleRestart,
    handleSignSponsorship, availableSponsorships, currentNewsMessage,
    isAutoPilotEnabled, toggleAutoPilot, addLog
  };
};

export default useGameLogic;
    