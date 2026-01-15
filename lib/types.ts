export type TeamSide = "red" | "black" | "pool";

export type Player = {
  id: string;
  firstName: string;
  lastInitial: string;
  canGoalie: boolean;
  availableToday: boolean;
};

export type Split = {
  red: string[];
  black: string[];
  goalieRedId?: string;
  goalieBlackId?: string;
};

export type TrainingSession = {
  id: string;
  dateISO: string;
  note?: string;
  split: Split;
};

export type GoalieStats = {
  count: number;
  lastISO?: string;
};
