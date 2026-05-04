export const CONTROL_QUESTIONNAIRE_STORAGE_KEY = "vulncontext.controlQuestionnaire";

export const DEFAULT_CONTROL_CONTEXT: Record<string, number> = {
  prevent_patch_maturity: 4,
  prevent_mfa_maturity: 5,
  prevent_segmentation_maturity: 3,
  prevent_hardening_maturity: 4,
  detect_logging_maturity: 3,
  detect_siem_maturity: 4,
  detect_speed_maturity: 3,
  respond_plan_maturity: 4,
  respond_speed_maturity: 3,
  respond_automation_maturity: 2,
  contain_edr_maturity: 4,
  contain_privilege_maturity: 3,
  contain_data_maturity: 5,
};

export type NestedControlContext = {
  prevent: {
    patch_maturity: number;
    mfa_maturity: number;
    segmentation_maturity: number;
    hardening_maturity: number;
  };
  detect: {
    logging_maturity: number;
    siem_maturity: number;
    speed_maturity: number;
  };
  respond: {
    plan_maturity: number;
    speed_maturity: number;
    automation_maturity: number;
  };
  contain: {
    edr_maturity: number;
    privilege_maturity: number;
    data_maturity: number;
  };
};

export function toNestedControlContext(
  context: Record<string, number>
): NestedControlContext {
  return {
    prevent: {
      patch_maturity: context.prevent_patch_maturity,
      mfa_maturity: context.prevent_mfa_maturity,
      segmentation_maturity: context.prevent_segmentation_maturity,
      hardening_maturity: context.prevent_hardening_maturity,
    },
    detect: {
      logging_maturity: context.detect_logging_maturity,
      siem_maturity: context.detect_siem_maturity,
      speed_maturity: context.detect_speed_maturity,
    },
    respond: {
      plan_maturity: context.respond_plan_maturity,
      speed_maturity: context.respond_speed_maturity,
      automation_maturity: context.respond_automation_maturity,
    },
    contain: {
      edr_maturity: context.contain_edr_maturity,
      privilege_maturity: context.contain_privilege_maturity,
      data_maturity: context.contain_data_maturity,
    },
  };
}

export function fromNestedControlContext(
  context: Record<string, Record<string, number>>
): Record<string, number> {
  return {
    prevent_patch_maturity:
      context.prevent?.patch_maturity ?? DEFAULT_CONTROL_CONTEXT.prevent_patch_maturity,
    prevent_mfa_maturity:
      context.prevent?.mfa_maturity ?? DEFAULT_CONTROL_CONTEXT.prevent_mfa_maturity,
    prevent_segmentation_maturity:
      context.prevent?.segmentation_maturity
      ?? DEFAULT_CONTROL_CONTEXT.prevent_segmentation_maturity,
    prevent_hardening_maturity:
      context.prevent?.hardening_maturity ?? DEFAULT_CONTROL_CONTEXT.prevent_hardening_maturity,
    detect_logging_maturity:
      context.detect?.logging_maturity ?? DEFAULT_CONTROL_CONTEXT.detect_logging_maturity,
    detect_siem_maturity:
      context.detect?.siem_maturity ?? DEFAULT_CONTROL_CONTEXT.detect_siem_maturity,
    detect_speed_maturity:
      context.detect?.speed_maturity ?? DEFAULT_CONTROL_CONTEXT.detect_speed_maturity,
    respond_plan_maturity:
      context.respond?.plan_maturity ?? DEFAULT_CONTROL_CONTEXT.respond_plan_maturity,
    respond_speed_maturity:
      context.respond?.speed_maturity ?? DEFAULT_CONTROL_CONTEXT.respond_speed_maturity,
    respond_automation_maturity:
      context.respond?.automation_maturity
      ?? DEFAULT_CONTROL_CONTEXT.respond_automation_maturity,
    contain_edr_maturity:
      context.contain?.edr_maturity ?? DEFAULT_CONTROL_CONTEXT.contain_edr_maturity,
    contain_privilege_maturity:
      context.contain?.privilege_maturity ?? DEFAULT_CONTROL_CONTEXT.contain_privilege_maturity,
    contain_data_maturity:
      context.contain?.data_maturity ?? DEFAULT_CONTROL_CONTEXT.contain_data_maturity,
  };
}

export function readControlContext(): Record<string, number> {
  if (typeof window === "undefined") {
    return DEFAULT_CONTROL_CONTEXT;
  }

  try {
    const raw = window.localStorage.getItem(CONTROL_QUESTIONNAIRE_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_CONTROL_CONTEXT;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return DEFAULT_CONTROL_CONTEXT;
    }

    return Object.fromEntries(
      Object.entries(DEFAULT_CONTROL_CONTEXT).map(([key, fallback]) => {
        const value = Number((parsed as Record<string, unknown>)[key]);
        return [key, Number.isFinite(value) ? value : fallback];
      })
    );
  } catch {
    return DEFAULT_CONTROL_CONTEXT;
  }
}

export function writeControlContext(context: Record<string, number>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CONTROL_QUESTIONNAIRE_STORAGE_KEY,
    JSON.stringify(context)
  );
}
