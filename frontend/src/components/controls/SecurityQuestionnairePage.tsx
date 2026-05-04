import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, RotateCcw, Save } from "lucide-react";

import {
  getCurrentControlAssessment,
  saveCurrentControlAssessment,
} from "../../api/controls";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  DEFAULT_CONTROL_CONTEXT,
  fromNestedControlContext,
  readControlContext,
  toNestedControlContext,
  writeControlContext,
} from "../../lib/controlQuestionnaire";
import { cn } from "../../lib/utils";

type ControlDomainId = "prevent" | "detect" | "respond" | "contain";

type ControlQuestion = {
  id: string;
  contextKey: string;
  label: string;
  prompt: string;
  options: Array<{
    score: number;
    label: string;
    detail?: string;
  }>;
  defaultScore: number;
};

type ControlDomain = {
  id: ControlDomainId;
  title: string;
  fairMapping: string;
  weight: number;
  toneClass: string;
  questions: ControlQuestion[];
};

const DOMAINS: ControlDomain[] = [
  {
    id: "prevent",
    title: "Prevent",
    fairMapping: "Resistance strength",
    weight: 0.35,
    toneClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
    questions: [
      {
        id: "patch",
        contextKey: "prevent_patch_maturity",
        label: "Patch management",
        prompt: "How quickly are critical vulnerabilities patched?",
        options: [
          { score: 0, label: "No process" },
          { score: 1, label: "Ad hoc" },
          { score: 2, label: ">30 days" },
          { score: 3, label: "14-30 days" },
          { score: 4, label: "<14 days" },
          { score: 5, label: "<7 days consistently" },
        ],
        defaultScore: 4,
      },
      {
        id: "mfa",
        contextKey: "prevent_mfa_maturity",
        label: "Access control (MFA)",
        prompt: "Is MFA enforced across critical systems?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Limited pilots" },
          { score: 2, label: "Some critical systems" },
          { score: 3, label: "Partial enforcement" },
          { score: 4, label: "Most critical systems" },
          { score: 5, label: "Full enforcement" },
        ],
        defaultScore: 5,
      },
      {
        id: "segmentation",
        contextKey: "prevent_segmentation_maturity",
        label: "Network segmentation",
        prompt: "Are systems segmented to limit lateral movement?",
        options: [
          { score: 0, label: "Flat network" },
          { score: 1, label: "Basic VLANs" },
          { score: 2, label: "Some tiering" },
          { score: 3, label: "Critical zones segmented" },
          { score: 4, label: "Strong segmentation" },
          { score: 5, label: "Zero trust controls" },
        ],
        defaultScore: 3,
      },
      {
        id: "hardening",
        contextKey: "prevent_hardening_maturity",
        label: "Hardening / configuration",
        prompt: "Are secure baselines enforced?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Informal standards" },
          { score: 2, label: "Documented baselines" },
          { score: 3, label: "Periodic checks" },
          { score: 4, label: "Managed enforcement" },
          { score: 5, label: "Automated + enforced" },
        ],
        defaultScore: 4,
      },
    ],
  },
  {
    id: "detect",
    title: "Detect",
    fairMapping: "Time-to-detect",
    weight: 0.25,
    toneClass: "border-indigo-200 bg-indigo-50 text-indigo-800",
    questions: [
      {
        id: "logging",
        contextKey: "detect_logging_maturity",
        label: "Logging coverage",
        prompt: "Are critical systems centrally logged?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Local logs only" },
          { score: 2, label: "Some central logging" },
          { score: 3, label: "Most critical systems" },
          { score: 4, label: "Broad central logging" },
          { score: 5, label: "Full centralized logging" },
        ],
        defaultScore: 3,
      },
      {
        id: "siem",
        contextKey: "detect_siem_maturity",
        label: "Monitoring / SIEM",
        prompt: "Are alerts generated and monitored?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Manual log review" },
          { score: 2, label: "Basic alerting" },
          { score: 3, label: "Monitored business hours" },
          { score: 4, label: "24/7 monitored alerts" },
          { score: 5, label: "Real-time monitored SIEM" },
        ],
        defaultScore: 4,
      },
      {
        id: "speed",
        contextKey: "detect_speed_maturity",
        label: "Detection speed",
        prompt: "How quickly are incidents typically detected?",
        options: [
          { score: 0, label: "Weeks" },
          { score: 1, label: "Several days" },
          { score: 2, label: "1-2 days" },
          { score: 3, label: "Same day" },
          { score: 4, label: "Within hours" },
          { score: 5, label: "Near real-time" },
        ],
        defaultScore: 3,
      },
    ],
  },
  {
    id: "respond",
    title: "Respond",
    fairMapping: "Time-to-respond",
    weight: 0.25,
    toneClass: "border-amber-200 bg-amber-50 text-amber-800",
    questions: [
      {
        id: "plan",
        contextKey: "respond_plan_maturity",
        label: "Incident response plan",
        prompt: "Is there a documented and tested IR plan?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Informal plan" },
          { score: 2, label: "Drafted plan" },
          { score: 3, label: "Documented plan" },
          { score: 4, label: "Tested occasionally" },
          { score: 5, label: "Tested regularly" },
        ],
        defaultScore: 4,
      },
      {
        id: "speed",
        contextKey: "respond_speed_maturity",
        label: "Response time",
        prompt: "How quickly can you contain incidents?",
        options: [
          { score: 0, label: "Several days" },
          { score: 1, label: "1-2 days" },
          { score: 2, label: "Same day" },
          { score: 3, label: "Several hours" },
          { score: 4, label: "1-2 hours" },
          { score: 5, label: "Minutes-hours" },
        ],
        defaultScore: 3,
      },
      {
        id: "automation",
        contextKey: "respond_automation_maturity",
        label: "Automation",
        prompt: "Are response actions automated?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Manual checklists" },
          { score: 2, label: "Scripted tasks" },
          { score: 3, label: "Some orchestration" },
          { score: 4, label: "Reusable playbooks" },
          { score: 5, label: "Automated playbooks" },
        ],
        defaultScore: 2,
      },
    ],
  },
  {
    id: "contain",
    title: "Contain",
    fairMapping: "Loss magnitude reduction",
    weight: 0.15,
    toneClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
    questions: [
      {
        id: "edr",
        contextKey: "contain_edr_maturity",
        label: "Endpoint protection (EDR/XDR)",
        prompt: "How broadly is endpoint detection and response deployed?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Pilot coverage" },
          { score: 2, label: "Partial servers" },
          { score: 3, label: "Most endpoints" },
          { score: 4, label: "Critical endpoints" },
          { score: 5, label: "Full deployment" },
        ],
        defaultScore: 4,
      },
      {
        id: "privilege",
        contextKey: "contain_privilege_maturity",
        label: "Privilege management",
        prompt: "Are least privilege and access controls enforced?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Informal reviews" },
          { score: 2, label: "Some least privilege" },
          { score: 3, label: "Role-based access" },
          { score: 4, label: "Regular access reviews" },
          { score: 5, label: "Strict + audited" },
        ],
        defaultScore: 3,
      },
      {
        id: "data",
        contextKey: "contain_data_maturity",
        label: "Data protection",
        prompt: "Is sensitive data encrypted and controlled?",
        options: [
          { score: 0, label: "None" },
          { score: 1, label: "Limited encryption" },
          { score: 2, label: "Some sensitive data" },
          { score: 3, label: "Encryption at rest" },
          { score: 4, label: "Encryption + access controls" },
          { score: 5, label: "Strong encryption + controls" },
        ],
        defaultScore: 5,
      },
    ],
  },
];

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function SecurityQuestionnairePage() {
  const [answers, setAnswers] = useState(readControlContext);
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">(
    "idle"
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSavedAssessment() {
      try {
        setSyncStatus("loading");
        setSyncError(null);
        const assessment = await getCurrentControlAssessment();
        if (!active) return;

        const next = fromNestedControlContext(assessment.answers);
        setAnswers(next);
        writeControlContext(next);
        setSyncStatus(assessment.id ? "saved" : "idle");
      } catch (err) {
        if (!active) return;
        setSyncStatus("error");
        setSyncError(
          err instanceof Error ? err.message : "Failed to load saved control assessment."
        );
      }
    }

    loadSavedAssessment();
    return () => {
      active = false;
    };
  }, []);

  const domainScores = useMemo(() => {
    return DOMAINS.map((domain) => {
      const normalizedScores = domain.questions.map(
        (question) => answers[question.contextKey] / 5
      );
      const score =
        normalizedScores.reduce((total, current) => total + current, 0) /
        normalizedScores.length;

      return { ...domain, score };
    });
  }, [answers]);

  const controlScore = useMemo(() => {
    return domainScores.reduce(
      (total, domain) => total + domain.weight * domain.score,
      0
    );
  }, [domainScores]);

  const contextJson = useMemo(
    () => JSON.stringify(toNestedControlContext(answers), null, 2),
    [answers]
  );

  const persistAnswers = async (nextAnswers: Record<string, number>) => {
    try {
      setSyncStatus("saving");
      setSyncError(null);
      await saveCurrentControlAssessment(toNestedControlContext(nextAnswers));
      setSyncStatus("saved");
    } catch (err) {
      setSyncStatus("error");
      setSyncError(
        err instanceof Error ? err.message : "Failed to save control assessment."
      );
    }
  };

  const updateAnswer = (contextKey: string, score: number) => {
    setAnswers((current) => {
      const next = { ...current, [contextKey]: score };
      writeControlContext(next);
      void persistAnswers(next);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(contextJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              FAIR-Aligned Control Maturity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {domainScores.map((domain) => (
              <div
                key={domain.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {domain.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {domain.fairMapping}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-semibold",
                      domain.toneClass
                    )}
                  >
                    {Math.round(domain.weight * 100)}%
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: formatPercent(domain.score) }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-slate-600">
                  {formatPercent(domain.score)} mature
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {DOMAINS.map((domain) => (
          <Card key={domain.id}>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {domain.title}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {domain.fairMapping}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-semibold",
                    domain.toneClass
                  )}
                >
                  Weight {Math.round(domain.weight * 100)}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="divide-y divide-slate-100">
                {domain.questions.map((question) => {
                  const value = answers[question.contextKey];
                  const selectedOption = question.options.find(
                    (option) => option.score === value
                  );

                  return (
                    <div
                      key={question.contextKey}
                      className="grid gap-3 py-4 first:pt-0 last:pb-0 xl:grid-cols-[minmax(0,330px)_1fr]"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {question.label}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {question.prompt}
                        </p>
                        <div className="mt-2 text-xs text-slate-500">
                          Context value:{" "}
                          <span className="font-semibold text-slate-700">
                            {value}
                          </span>
                          {selectedOption ? (
                            <span> - {selectedOption.label}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {question.options.map((option) => {
                          const active = option.score === value;

                          return (
                            <button
                              key={`${question.contextKey}-${option.score}`}
                              type="button"
                              className={cn(
                                "min-h-12 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                active
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              )}
                              onClick={() =>
                                updateAnswer(question.contextKey, option.score)
                              }
                            >
                              <span className="block font-semibold">
                                {option.label}
                              </span>
                              {option.detail ? (
                                <span
                                  className={cn(
                                    "mt-1 block text-xs",
                                    active ? "text-slate-300" : "text-slate-500"
                                  )}
                                >
                                  {option.detail}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Control Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold tracking-tight text-slate-900">
              {formatPercent(controlScore)}
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-slate-950"
                style={{ width: formatPercent(controlScore) }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Weighted from Prevent, Detect, Respond, and Contain maturity. Each
              answer is normalized as score / 5 before domain weighting.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Context Payload</CardTitle>
                <p className="mt-1 text-xs text-slate-500">
                  {syncStatus === "loading"
                    ? "Loading saved assessment..."
                    : syncStatus === "saving"
                      ? "Saving assessment..."
                      : syncStatus === "saved"
                        ? "Saved to Supabase."
                        : syncStatus === "error"
                          ? syncError ?? "Unable to sync assessment."
                          : "Local questionnaire context."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Reset questionnaire"
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setAnswers(DEFAULT_CONTROL_CONTEXT);
                    writeControlContext(DEFAULT_CONTROL_CONTEXT);
                    void persistAnswers(DEFAULT_CONTROL_CONTEXT);
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncStatus === "saving"}
                  onClick={() => void persistAnswers(answers)}
                >
                  <Save className="h-4 w-4" />
                  {syncStatus === "saving" ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  aria-label="Copy context payload"
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[520px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
              {contextJson}
            </pre>
          </CardContent>
        </Card>
      </aside>
    </section>
  );
}
