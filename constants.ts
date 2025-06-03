
import { PlayerStats, TrainingOption, TrainingType, Opponent, Sponsorship, GameNewsEvent } from './types';

export const INITIAL_PLAYER_STATS: PlayerStats = {
  playerName: "유밥", // Default player name changed
  strength: 10,
  speed: 10,
  stamina: 50, // Max stamina
  currentStamina: 50,
  technique: 5,
  health: 100, // Max health
  currentHealth: 100,
  wins: 0,
  losses: 0,
  rank: "신인",
  reputation: 0,
  funds: 100, // 초기 자금
  activeSponsorships: [],
  completedSponsorshipIds: [],
  traits: [], // Initialize traits
};

export const MAX_STAT_VALUE = 100;
export const MAX_HEALTH = 100;

export const REPUTATION_GAIN_WIN_DEFAULT = 8; // Reduced from 10
export const REPUTATION_GAIN_WIN_RANK_BONUS = 5; 
export const REPUTATION_LOSS_DEFAULT = 7; // Increased from 5


export const TRAINING_OPTIONS: TrainingOption[] = [
  {
    id: TrainingType.SANDBAG,
    name: "샌드백 훈련",
    description: "펀치력과 기술을 연마합니다.",
    effects: { strength: 1, technique: 1 }, // Strength 2->1
    staminaCost: 12, // Increased from 10
    duration: 1,
  },
  {
    id: TrainingType.ROADWORK,
    name: "로드워크",
    description: "지구력과 스피드를 향상시킵니다.",
    effects: { stamina: 2, speed: 1 },  // Stamina 3->2
    staminaCost: 18, // Increased from 15
    duration: 1,
  },
  {
    id: TrainingType.SPARRING,
    name: "스파링",
    description: "실전 감각을 익히고 모든 능력치를 단련합니다. 부상 위험이 다소 높습니다.",
    effects: { strength: 1, speed: 1, technique: 1, healthChange: -12 }, // Technique 2->1, HealthChange -10 -> -12
    staminaCost: 22, // Increased from 20
    duration: 1,
  },
  {
    id: TrainingType.WEIGHT_LIFTING,
    name: "웨이트 트레이닝",
    description: "근력을 집중적으로 강화합니다.",
    effects: { strength: 2 }, // Strength 3->2
    staminaCost: 18, // Increased from 15
    duration: 1,
  },
  {
    id: TrainingType.REST,
    name: "휴식 및 회복",
    description: "체력과 건강을 효과적으로 회복합니다.",
    effects: { healthChange: 25, staminaChange: 30 }, // Health 30->25, Stamina 35->30
    staminaCost: 0,
    duration: 1,
  },
];

const applyOpponentDifficultyScaling = (opponents: Opponent[]): Opponent[] => {
  const baseMultipliers = {
    strength: 1.15,
    speed: 1.15,
    technique: 1.15,
    stamina: 1.10,
    health: 1.10,
  };

  const getTierMultipliers = (rank?: string) => {
    let str_add = 1.0, spd_add = 1.0, tech_add = 1.0, sta_add = 1.0, health_add = 1.0;
    switch (rank) {
      case "챔피언":
        str_add = 1.20; spd_add = 1.20; tech_add = 1.20; sta_add = 1.15; health_add = 1.15; break;
      case "랭커":
        str_add = 1.15; spd_add = 1.15; tech_add = 1.15; sta_add = 1.10; health_add = 1.10; break;
      case "프로":
        str_add = 1.10; spd_add = 1.10; tech_add = 1.10; sta_add = 1.05; health_add = 1.05; break;
      case "유망주":
        str_add = 1.05; spd_add = 1.05; tech_add = 1.05; break;
      default: // 신인
        break;
    }
    return {
      strength: baseMultipliers.strength * str_add,
      speed: baseMultipliers.speed * spd_add,
      technique: baseMultipliers.technique * tech_add,
      stamina: baseMultipliers.stamina * sta_add,
      health: baseMultipliers.health * health_add,
    };
  };

  return opponents.map(op => {
    const tierMults = getTierMultipliers(op.rankRequired);
    return {
      ...op,
      stats: {
        strength: Math.round(op.stats.strength * tierMults.strength),
        speed: Math.round(op.stats.speed * tierMults.speed),
        stamina: Math.round(op.stats.stamina * tierMults.stamina),
        technique: Math.round(op.stats.technique * tierMults.technique),
        health: Math.round(op.stats.health * tierMults.health),
      }
    };
  });
};


const BASE_OPPONENTS: Opponent[] = [
  {
    id: "rookie_1",
    name: "풋내기 복서",
    stats: { strength: 8, speed: 7, stamina: 40, technique: 4, health: 70 },
    description: "복싱에 막 입문한 어설픈 신인입니다.",
    rankRequired: "신인",
  },
  {
    id: "street_brawler_1",
    name: "거리의 싸움꾼",
    stats: { strength: 12, speed: 8, stamina: 50, technique: 3, health: 75 },
    description: "정식 훈련은 받지 않았지만, 거친 싸움에는 이골이 난 상대입니다.",
    rankRequired: "신인",
  },
  {
    id: "local_hopeful_1",
    name: "동네 유망주",
    stats: { strength: 15, speed: 12, stamina: 60, technique: 10, health: 80 },
    description: "지역 대회에서 몇 번 입상한 경험이 있는 선수입니다.",
    rankRequired: "유망주",
  },
  {
    id: "swift_outboxer_1",
    name: "날렵한 아웃복서",
    stats: { strength: 10, speed: 20, stamina: 55, technique: 18, health: 75 },
    description: "빠른 발과 정확한 잽으로 상대를 농락하는 타입입니다.",
    rankRequired: "유망주",
  },
  {
    id: "seasoned_fighter_1",
    name: "노련한 복서",
    stats: { strength: 25, speed: 20, stamina: 75, technique: 22, health: 90 },
    description: "수많은 경기를 치른 베테랑. 만만치 않은 상대입니다.",
    rankRequired: "프로",
  },
  {
    id: "iron_infighter_1",
    name: "강철의 인파이터",
    stats: { strength: 35, speed: 15, stamina: 80, technique: 18, health: 100 },
    description: "맷집이 강하고, 파고들어 강력한 한 방을 노리는 인파이팅 전문가입니다.",
    rankRequired: "프로",
  },
  {
    id: "rising_star_1",
    name: "떠오르는 신성",
    stats: { strength: 30, speed: 28, stamina: 80, technique: 30, health: 95 },
    description: "최근 무패 행진을 이어가며 챔피언 자리를 노리는 무서운 신예입니다.",
    rankRequired: "프로",
  },
   {
    id: "regional_champ_1",
    name: "지역 챔피언",
    stats: { strength: 40, speed: 35, stamina: 85, technique: 35, health: 100 },
    description: "지역 타이틀을 보유한 강력한 챔피언. 최고의 기술과 힘을 자랑합니다.",
    rankRequired: "랭커",
  },
  {
    id: "retired_champion_1",
    name: "은퇴한 챔피언",
    stats: { strength: 45, speed: 30, stamina: 70, technique: 40, health: 90 },
    description: "왕년의 챔피언. 녹슬지 않은 실력을 보여줄 것입니다. 전설에게 도전하세요!",
    rankRequired: "랭커", 
  },
  { 
    id: "world_champion_1",
    name: "세계 챔피언",
    stats: { strength: 55, speed: 50, stamina: 90, technique: 50, health: 100 },
    description: "현 세계 챔피언. 복싱의 정점에 선, 그야말로 완벽한 복서입니다.",
    rankRequired: "챔피언",
  }
];

export const OPPONENTS: Opponent[] = applyOpponentDifficultyScaling(BASE_OPPONENTS);

export const RANKS = ["신인", "유망주", "프로", "랭커", "챔피언"];

export const RANK_UP_WINS = {
  "신인": 3,      // Increased from 2
  "유망주": 4,  // Increased from 3
  "프로": 6,    // Increased from 4
  "랭커": 7,    // Increased from 5
};

export const AVAILABLE_SPONSORSHIPS: Sponsorship[] = [
  {
    id: "local_gym_support",
    name: "동네 체육관 후원",
    description: "지역 체육관에서 소정의 훈련 지원금을 지급합니다.",
    reputationRequired: 20,
    benefitType: 'weekly',
    amount: 40, // 주간 $50 -> $40
    durationWeeks: 10,
  },
  {
    id: "rookie_energy_drink",
    name: "신인 에너지 드링크 광고",
    description: "새로 출시된 에너지 드링크의 홍보 모델이 되어 일회성 광고료를 받습니다.",
    reputationRequired: 75,
    benefitType: 'one_time',
    amount: 200, // 일회성 $250 -> $200
  },
  {
    id: "sports_gear_basic",
    name: "기본 스포츠 용품 모델",
    description: "스포츠 용품 회사와 기본 모델 계약을 체결합니다.",
    reputationRequired: 150,
    benefitType: 'weekly',
    amount: 100, // 주간 $120 -> $100
    durationWeeks: 8,
  },
  {
    id: "regional_tournament_sponsor",
    name: "지역 대회 스폰서",
    description: "지역 복싱 토너먼트의 공식 스폰서 중 하나로 선정되어 후원금을 받습니다.",
    reputationRequired: 300,
    benefitType: 'one_time',
    amount: 550, // 일회성 $700 -> $550
  },
  {
    id: "national_brand_ambassador",
    name: "국내 스포츠 브랜드 홍보대사",
    description: "유명 스포츠 브랜드의 홍보대사가 되어 정기적인 지원을 받습니다.",
    reputationRequired: 600,
    benefitType: 'weekly',
    amount: 240, // 주간 $300 -> $240
    durationWeeks: 12,
  },
  {
    id: "global_enterprise_deal",
    name: "글로벌 기업 파트너십",
    description: "세계적인 기업과의 대형 파트너십 계약으로 막대한 부를 얻습니다.",
    reputationRequired: 1200,
    benefitType: 'one_time',
    amount: 2000, // 일회성 $2500 -> $2000
  }
];

export const GAME_NEWS_EVENTS: GameNewsEvent[] = [
  {
    id: "news_generic_01",
    message: "체육관 관장이 당신의 성실함을 칭찬했습니다.",
    logMessage: "체육관 관장이 당신의 성실함을 칭찬했습니다. 별다른 효과는 없지만 기분은 좋네요!",
  },
  {
    id: "news_funds_loss_01",
    message: "물가가 약간 상승했습니다. 생활비로 자금이 소모됩니다.",
    effects: [{ type: 'funds', value: -15, message: "자금 $15 감소" }], // Increased loss
    condition: (stats) => stats.funds > 30,
  },
  {
    id: "news_reputation_gain_01",
    message: "최근 당신의 경기가 지역 신문에 긍정적으로 실렸습니다!",
    effects: [{ type: 'reputation', value: 4, message: "평판 +4" }], // Reduced gain
  },
  {
    id: "news_health_loss_01",
    message: "가벼운 감기 기운이 느껴집니다. 컨디션 관리에 유의하세요.",
    effects: [{ type: 'currentHealth', value: -7, message: "현재 건강 -7" }], // Increased loss
    condition: (stats) => stats.currentHealth > 25,
  },
  {
    id: "news_stamina_gain_01",
    message: "오늘따라 몸이 가볍습니다! 컨디션 최상!",
    effects: [{ type: 'currentStamina', value: 8, message: "현재 스태미나 +8" }], // Reduced gain
  },
  {
    id: "news_training_boost_01",
    message: "훈련 시설에 새로운 장비가 도입되었다는 소식입니다!",
    logMessage: "훈련 시설에 새로운 장비가 도입되었다는 소식입니다! 다음 훈련에 긍정적인 영향이 있을지도 모릅니다.",
  },
  {
    id: "news_rank_pro_01",
    message: "프로 복서들 사이에서 당신의 이름이 조금씩 오르내리기 시작합니다.",
    condition: (stats) => stats.rank === "프로",
  },
  {
    id: "news_funds_gain_small_01",
    message: "길에서 우연히 소액의 돈을 주웠습니다!",
    effects: [{ type: 'funds', value: 15, message: "자금 $15 증가" }], // Reduced gain
  },
  {
    id: "news_opponent_rumor_01",
    message: "다음 상대가 당신을 분석하며 맹훈련 중이라는 소문이 있습니다.",
    logMessage: "다음 경기 상대가 당신을 철저히 분석하며 맹훈련 중이라는 소문이 들려옵니다. 긴장해야겠습니다.",
    condition: (stats, week) => week > 5 && stats.wins > 0,
  },
   {
    id: "news_minor_injury_recovery",
    message: "지난 번 가벼운 부상이 생각보다 빨리 회복되었습니다.",
    effects: [{ type: 'currentHealth', value: 2, message: "현재 건강 +2"}], // Reduced gain
    condition: (stats) => stats.currentHealth < stats.health && stats.currentHealth > 10,
  },
  {
    id: "news_unexpected_expense_01",
    message: "예상치 못한 장비 수리 비용이 발생했습니다.",
    effects: [{ type: 'funds', value: -20, message: "자금 $20 감소"}], // Increased loss
    condition: (stats) => stats.funds > 40,
  },
  {
    id: "news_fan_gift_01",
    message: "익명의 팬으로부터 작은 격려 선물이 도착했습니다!",
    effects: [
        { type: 'reputation', value: 1, message: "평판 +1"}, // Reduced gain
        { type: 'currentStamina', value: 3, message: "현재 스태미나 +3"} // Reduced gain
    ],
  }
];
