export const BRINQA_RESET_SESSION_CHANNEL = "brinqa-auth:reset-session";

export type BrinqaResetReason = "logout" | "unauthorized" | "shutdown";

export type BrinqaResetRequest = {
  reason: BrinqaResetReason;
  reopenLogin?: boolean;
  includeRemoteLogout?: boolean;
  quitApp?: boolean;
};

export interface BrinqaDesktopAuthApi {
  resetSession(request: BrinqaResetRequest): Promise<void>;
}
