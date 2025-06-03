
export interface PlayerStats {
  playerName: string; // 선수 이름
  strength: number; // 힘
  speed: number;    // 속도
  stamina: number;  // 체력 (최대치)
  currentStamina: number; // 현재 체력
  technique: number; // 기술
  health: number;    // 건강 (최대치)
  currentHealth: number; // 현재 건강
  wins: number;
  losses: number;
  rank: string;
  reputation: number; // 명성 포인트
  funds: number; // 자금
  activeSponsorships: ActiveSponsorship[]; // 현재 진행 중인 스폰서 계약
  completedSponsorshipIds: string[]; // 완료된 일회성 또는 만료된 주간 스폰서 ID 목록
  traits: string[]; // 선수가 획득한 특성 목록
}

export interface Opponent {
  id: string;
  name: string;
  stats: {
    strength: number;
    speed: number;
    stamina: number;
    technique: number;
    health: number;
  };
  isDefeated?: boolean;
  description: string;
  rankRequired?: string; // Rank required to fight this opponent
}

export enum TrainingType {
  SANDBAG = "SANDBAG",
  ROADWORK = "ROADWORK",
  SPARRING = "SPARRING",
  WEIGHT_LIFTING = "WEIGHT_LIFTING",
  REST = "REST",
}

export interface TrainingOption {
  id: TrainingType;
  name: string;
  description: string;
  effects: Partial<Record<keyof Omit<PlayerStats, 'wins' | 'losses' | 'rank' | 'currentHealth' | 'currentStamina' | 'playerName' | 'reputation' | 'funds' | 'activeSponsorships' | 'completedSponsorshipIds' | 'traits'>, number>> & { healthChange?: number, staminaChange?: number};
  staminaCost: number;
  duration: number; // in weeks, usually 1
}

export interface LogEntry {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "fight" | "finance" | "news";
  week: number;
  important?: boolean; // Optional flag for game clear messages etc.
}

export enum GamePhase {
  PLAYER_SETUP = "PLAYER_SETUP", // Phase for player name input
  MENU = "MENU", // Main menu, choosing actions
  TRAINING_RESULT = "TRAINING_RESULT",
  FIGHT_PREPARATION = "FIGHT_PREPARATION",
  FIGHTING = "FIGHTING",
  FIGHT_RESULT = "FIGHT_RESULT",
  GAME_OVER = "GAME_OVER",
  GAME_CLEAR = "GAME_CLEAR", // Player has beaten the game
}

export const STAT_NAMES_KOREAN: Record<keyof Omit<PlayerStats, 'wins' | 'losses' | 'rank' | 'currentStamina' | 'currentHealth' | 'playerName' | 'reputation' | 'funds' | 'activeSponsorships' | 'completedSponsorshipIds' | 'traits'>, string> = {
  strength: "힘",
  speed: "속도",
  stamina: "최대 스태미나",
  technique: "기술",
  health: "최대 건강",
};

export interface ChartDataItem {
  name: string;
  value: number;
  maxValue: number;
}

export interface Sponsorship {
  id:string;
  name: string;
  description: string;
  reputationRequired: number;
  benefitType: 'weekly' | 'one_time';
  amount: number; // Money amount
  durationWeeks?: number; // Only for 'weekly' type
  // logoUrl?: string; // Optional: for future visual enhancement
}

export interface ActiveSponsorship extends Sponsorship {
  weeksRemaining: number;
}

// News/Events Feature
export type NewsEffectType = 'reputation' | 'funds' | 'currentHealth' | 'currentStamina' | 'strength' | 'speed' | 'technique' | 'stamina' | 'health';

export interface GameNewsEventEffect {
  type: NewsEffectType;
  value: number;
  message?: string; // Optional: Specific message for the effect part in the log
}
export interface GameNewsEvent {
  id: string;
  message: string; // Main message for the news display
  logMessage?: string; // Optional: More detailed message for the game log
  effects?: GameNewsEventEffect[];
  condition?: (playerStats: PlayerStats, gameWeek: number) => boolean;
}

// Fight System Specific Types
export interface FightEvent {
  id: string; // Unique ID for key prop
  type: 'text' | 'player_action' | 'opponent_action' | 'health_update' | 'stamina_update' | 'round_marker' | 'fight_conclusion';
  message: string;
  playerHealth?: number;
  opponentHealth?: number;
  playerStamina?: number;
  opponentStamina?: number;
  isCritical?: boolean; // For special emphasis
  isDamage?: boolean; // If it's a damage event
}

export interface PlayerSnapshot {
  strength: number;
  speed: number;
  technique: number;
  health: number; // Max health
  stamina: number; // Max stamina
  rank: string;
  playerName: string;
  traits: string[];
}

export interface CurrentFightState {
  opponent: Opponent | null;
  playerSnapshot: PlayerSnapshot | null;
  playerFightHealth: number;
  playerFightStamina: number;
  opponentFightHealth: number;
  opponentFightStamina: number;
  currentRound: number;
  roundLog: FightEvent[]; 
  fullFightTranscript: FightEvent[]; 
  isFightOver: boolean;
  winner: 'player' | 'opponent' | null;
  isProcessingRoundEvents: boolean; 
  uiReadyForNextEvent: boolean; 
}
