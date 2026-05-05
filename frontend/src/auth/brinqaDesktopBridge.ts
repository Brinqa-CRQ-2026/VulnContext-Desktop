export const BRINQA_RESET_SESSION_CHANNEL = "brinqa-auth:reset-session";
export const BRINQA_GET_UI_ONLY_MODE_CHANNEL = "brinqa-runtime:get-ui-only-mode";
export const BRINQA_SET_UI_ONLY_MODE_CHANNEL = "brinqa-runtime:set-ui-only-mode";

export type BrinqaResetReason = "logout" | "unauthorized" | "shutdown";

export type BrinqaResetRequest = {
  reason: BrinqaResetReason;
  reopenLogin?: boolean;
  includeRemoteLogout?: boolean;
  quitApp?: boolean;
};

export interface BrinqaDesktopAuthApi {
  resetSession(request: BrinqaResetRequest): Promise<void>;
  isUiOnlyMode(): boolean;
  setUiOnlyMode(enabled: boolean): Promise<boolean>;
}
