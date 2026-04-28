import type { PropsWithChildren } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { ApplicationSummary, AssetSummary, ScoredFinding, SortOrder } from "../../api/types";
import { cn } from "../../lib/utils";
import { Pill } from "../ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export type ApplicationSortKey = "application" | "slug" | "asset_count" | "finding_count";
export type AssetSortKey =
  | "name"
  | "asset_type"
  | "business_service"
  | "application"
  | "asset_criticality"
  | "status"
  | "finding_count";
export type FindingSortKey =
  | "title"
  | "finding_id"
  | "status"
  | "risk_band"
  | "risk_score"
  | "source_risk_score"
  | "cvss_score"
  | "epss_score"
  | "age_in_days"
  | "kev";

export interface SortState<TSortKey extends string> {
  key: TSortKey;
  order: SortOrder;
}

interface ApplicationsDrillDownTableProps {
  applications: ApplicationSummary[];
  sort: SortState<ApplicationSortKey>;
  onSortChange: (sort: SortState<ApplicationSortKey>) => void;
  onOpenApplication: (application: ApplicationSummary) => void;
}

interface AssetsDrillDownTableProps {
  assets: AssetSummary[];
  sort: SortState<AssetSortKey>;
  onSortChange: (sort: SortState<AssetSortKey>) => void;
  onOpenAsset: (asset: AssetSummary) => void;
  showBusinessService?: boolean;
  showApplication?: boolean;
  enableSorting?: boolean;
}

interface FindingsDrillDownTableProps {
  findings: ScoredFinding[];
  sort: SortState<FindingSortKey>;
  onSortChange: (sort: SortState<FindingSortKey>) => void;
  onOpenFinding: (finding: ScoredFinding) => void;
  enableSorting?: boolean;
}

export function ApplicationsDrillDownTable({
  applications,
  sort,
  onSortChange,
  onOpenApplication,
}: ApplicationsDrillDownTableProps) {
  const sortedApplications = [...applications].sort((left, right) =>
    compareValues(
      getApplicationSortValue(left, sort.key),
      getApplicationSortValue(right, sort.key),
      sort.order
    )
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            label="Application"
            isActive={sort.key === "application"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "application"))}
          />
          <SortableHeader
            label="Identifier"
            isActive={sort.key === "slug"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "slug"))}
          />
          <SortableHeader
            label="Assets"
            isActive={sort.key === "asset_count"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "asset_count"))}
            className="text-right"
          />
          <SortableHeader
            label="Findings"
            isActive={sort.key === "finding_count"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "finding_count"))}
            className="text-right"
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedApplications.map((application) => (
          <InteractiveRow
            key={application.slug}
            label={`Open ${application.application}`}
            onClick={() => onOpenApplication(application)}
          >
            <TableCell>
              <div className="font-medium text-slate-900">{application.application}</div>
            </TableCell>
            <TableCell className="text-slate-500">{application.slug}</TableCell>
            <TableCell className="text-right">
              {application.metrics.total_assets.toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-medium text-slate-900">
              {application.metrics.total_findings.toLocaleString()}
            </TableCell>
          </InteractiveRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AssetsDrillDownTable({
  assets,
  sort,
  onSortChange,
  onOpenAsset,
  showBusinessService = false,
  showApplication = false,
  enableSorting = true,
}: AssetsDrillDownTableProps) {
  const sortedAssets = enableSorting
    ? [...assets].sort((left, right) =>
        compareValues(
          getAssetSortValue(left, sort.key),
          getAssetSortValue(right, sort.key),
          sort.order
        )
      )
    : assets;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            label="Status"
            isActive={sort.key === "status"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "status"))}
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
          <SortableHeader
            label="Compliance"
            isActive={false}
            order={sort.order}
            onClick={() => undefined}
            disabled
            showIcon={false}
          />
          <SortableHeader
            label="Asset"
            isActive={sort.key === "name"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "name"))}
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
          <SortableHeader
            label="Category"
            isActive={false}
            order={sort.order}
            onClick={() => undefined}
            disabled
            showIcon={false}
          />
          <SortableHeader
            label="Asset type"
            isActive={sort.key === "asset_type"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "asset_type"))}
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
          <SortableHeader
            label="Environment"
            isActive={false}
            order={sort.order}
            onClick={() => undefined}
            disabled
            showIcon={false}
          />
          {showBusinessService ? (
            <SortableHeader
              label="Business service"
              isActive={sort.key === "business_service"}
              order={sort.order}
              onClick={() => onSortChange(toggleSort(sort, "business_service"))}
              disabled={!enableSorting}
              showIcon={enableSorting}
            />
          ) : null}
          {showApplication ? (
            <SortableHeader
              label="Application"
              isActive={sort.key === "application"}
              order={sort.order}
              onClick={() => onSortChange(toggleSort(sort, "application"))}
              disabled={!enableSorting}
              showIcon={enableSorting}
            />
          ) : null}
          <SortableHeader
            label="Finding risk"
            isActive={sort.key === "asset_criticality"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "asset_criticality"))}
            className="border-l border-slate-200 pl-4 text-right"
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
          <SortableHeader
            label="Criticality"
            isActive={sort.key === "asset_criticality"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "asset_criticality"))}
            className="text-right"
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
          <SortableHeader
            label="Findings"
            isActive={sort.key === "finding_count"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "finding_count"))}
            className="text-right font-semibold text-slate-900"
            disabled={!enableSorting}
            showIcon={enableSorting}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAssets.map((asset) => (
          <InteractiveRow
            key={asset.asset_id}
            label={`Open ${getAssetName(asset)}`}
            onClick={() => onOpenAsset(asset)}
          >
            <TableCell>
              <AssetStatusBadge status={asset.status} />
            </TableCell>
            <TableCell>
              <AssetComplianceBadges asset={asset} />
            </TableCell>
            <TableCell>
              <div className="font-medium text-slate-900">{getAssetName(asset)}</div>
            </TableCell>
            <TableCell>{formatCategory(asset.category)}</TableCell>
            <TableCell className="text-slate-500">{getAssetType(asset)}</TableCell>
            <TableCell>{formatEnvironment(asset.environment)}</TableCell>
            {showBusinessService ? (
              <TableCell>{formatText(asset.business_service)}</TableCell>
            ) : null}
            {showApplication ? <TableCell>{formatText(asset.application)}</TableCell> : null}
            <TableCell className="border-l border-slate-200 pl-4 text-right">
              {formatNullable(asset.aggregated_finding_risk)}
            </TableCell>
            <TableCell className="text-right">
              {formatNullable(asset.asset_context_score)}
            </TableCell>
            <TableCell className="text-right font-semibold text-slate-900">
              {asset.finding_count.toLocaleString()}
            </TableCell>
          </InteractiveRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FindingsDrillDownTable({
  findings,
  sort,
  onSortChange,
  onOpenFinding,
  enableSorting = true,
}: FindingsDrillDownTableProps) {
  const sortedFindings = enableSorting
    ? [...findings].sort((left, right) =>
        compareValues(
          getFindingSortValue(left, sort.key),
          getFindingSortValue(right, sort.key),
          sort.order
        )
      )
    : findings;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader
            label="Finding"
            isActive={sort.key === "title"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "title"))}
            disabled={!enableSorting}
          />
          <SortableHeader
            label="CVE / Source ID"
            isActive={sort.key === "finding_id"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "finding_id"))}
            disabled={!enableSorting}
          />
          <SortableHeader
            label="Status"
            isActive={sort.key === "status"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "status"))}
            disabled={!enableSorting}
          />
          <SortableHeader
            label="Display risk"
            isActive={sort.key === "risk_band"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "risk_band"))}
            disabled={!enableSorting}
          />
          <SortableHeader
            label="Score"
            isActive={sort.key === "risk_score"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "risk_score"))}
            className="text-right"
            disabled={!enableSorting}
          />
          <SortableHeader
            label="Vendor risk"
            isActive={sort.key === "source_risk_score"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "source_risk_score"))}
            className="text-right"
            disabled={!enableSorting}
          />
          <SortableHeader
            label="CVSS"
            isActive={sort.key === "cvss_score"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "cvss_score"))}
            className="text-right"
            disabled={!enableSorting}
          />
          <SortableHeader
            label="EPSS"
            isActive={sort.key === "epss_score"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "epss_score"))}
            className="text-right"
            disabled={!enableSorting}
          />
          <SortableHeader
            label="Age"
            isActive={sort.key === "age_in_days"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "age_in_days"))}
            className="text-right"
            disabled={!enableSorting}
          />
          <SortableHeader
            label="KEV"
            isActive={sort.key === "kev"}
            order={sort.order}
            onClick={() => onSortChange(toggleSort(sort, "kev"))}
            className="text-center"
            disabled={!enableSorting}
          />
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedFindings.map((finding) => (
          <InteractiveRow
            key={finding.id}
            label={`Open ${getDisplayFindingTitle(finding)}`}
            onClick={() => onOpenFinding(finding)}
          >
            <TableCell>
              <div className="font-medium text-slate-900">{getDisplayFindingTitle(finding)}</div>
            </TableCell>
            <TableCell className="text-slate-500">
              {finding.cve_id ?? finding.record_id ?? `ID ${finding.id}`}
            </TableCell>
            <TableCell>
              <div className="flex max-w-[16rem] flex-wrap gap-1">
                {finding.status ? <Tag tone="neutral">{finding.status}</Tag> : null}
                {finding.lifecycle_status ? (
                  <Tag tone="neutral">{finding.lifecycle_status}</Tag>
                ) : null}
                {finding.compliance_status ? (
                  <Tag tone="warn">{finding.compliance_status}</Tag>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", bandPillClass(finding.risk_band))}>
                {finding.risk_band ?? "Unscored"}
              </span>
            </TableCell>
            <TableCell className="text-right">{formatNullable(finding.risk_score)}</TableCell>
            <TableCell className="text-right">
              {formatNullable(finding.source_risk_score)}
            </TableCell>
            <TableCell className="text-right">{formatNullable(finding.cvss_score)}</TableCell>
            <TableCell className="text-right">{formatNullable(finding.epss_score, 4)}</TableCell>
            <TableCell className="text-right">
              {finding.age_in_days === null || finding.age_in_days === undefined
                ? "—"
                : `${formatNullable(finding.age_in_days, 0)}d`}
            </TableCell>
            <TableCell className="text-center">{finding.isKev ? "Yes" : "—"}</TableCell>
          </InteractiveRow>
        ))}
      </TableBody>
    </Table>
  );
}

function SortableHeader({
  label,
  isActive,
  order,
  onClick,
  className,
  disabled = false,
  showIcon = true,
}: {
  label: string;
  isActive: boolean;
  order: SortOrder;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
}) {
  const Icon = !showIcon ? null : !isActive ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900 disabled:cursor-default disabled:hover:text-slate-500",
          className?.includes("text-right") ? "ml-auto flex" : "",
          className?.includes("text-center") ? "mx-auto flex" : ""
        )}
      >
        <span>{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      </button>
    </TableHead>
  );
}

function InteractiveRow({
  label,
  onClick,
  children,
}: PropsWithChildren<{ label: string; onClick: () => void }>) {
  return (
    <TableRow
      role="button"
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer hover:bg-slate-50"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </TableRow>
  );
}

function Tag({
  tone,
  children,
}: PropsWithChildren<{ tone: "neutral" | "warn" | "success" | "dark" }>) {
  return <Pill tone={tone}>{children}</Pill>;
}

function toggleSort<TSortKey extends string>(
  currentSort: SortState<TSortKey>,
  nextKey: TSortKey
): SortState<TSortKey> {
  if (currentSort.key === nextKey) {
    return {
      key: nextKey,
      order: currentSort.order === "asc" ? "desc" : "asc",
    };
  }

  return {
    key: nextKey,
    order: "asc",
  };
}

function compareValues(left: string | number | boolean | null, right: string | number | boolean | null, order: SortOrder) {
  const direction = order === "asc" ? 1 : -1;

  if (typeof left === "string" || typeof right === "string") {
    const normalizedLeft = String(left ?? "").toLowerCase();
    const normalizedRight = String(right ?? "").toLowerCase();
    return normalizedLeft.localeCompare(normalizedRight) * direction;
  }

  const normalizedLeft = typeof left === "boolean" ? Number(left) : (left ?? Number.NEGATIVE_INFINITY);
  const normalizedRight = typeof right === "boolean" ? Number(right) : (right ?? Number.NEGATIVE_INFINITY);
  return (normalizedLeft - normalizedRight) * direction;
}

function getApplicationSortValue(application: ApplicationSummary, key: ApplicationSortKey) {
  switch (key) {
    case "application":
      return application.application;
    case "slug":
      return application.slug;
    case "asset_count":
      return application.metrics.total_assets;
    case "finding_count":
      return application.metrics.total_findings;
  }
}

function getAssetSortValue(asset: AssetSummary, key: AssetSortKey) {
  switch (key) {
    case "name":
      return getAssetName(asset);
    case "asset_type":
      return getAssetType(asset);
    case "business_service":
      return asset.business_service ?? null;
    case "application":
      return asset.application ?? null;
    case "asset_criticality":
      return asset.asset_context_score ?? null;
    case "status":
      return asset.status ?? null;
    case "finding_count":
      return asset.finding_count;
  }
}

function getFindingSortValue(finding: ScoredFinding, key: FindingSortKey) {
  switch (key) {
    case "title":
      return getDisplayFindingTitle(finding);
    case "finding_id":
      return finding.cve_id ?? finding.record_id ?? finding.id;
    case "status":
      return [finding.status, finding.lifecycle_status, finding.compliance_status]
        .filter(Boolean)
        .join(" ");
    case "risk_band":
      return riskBandWeight(finding.risk_band);
    case "risk_score":
      return finding.risk_score ?? null;
    case "source_risk_score":
      return finding.source_risk_score ?? null;
    case "cvss_score":
      return finding.cvss_score ?? null;
    case "epss_score":
      return finding.epss_score ?? null;
    case "age_in_days":
      return finding.age_in_days ?? null;
    case "kev":
      return Boolean(finding.isKev);
  }
}

function getDisplayFindingTitle(finding: ScoredFinding) {
  const raw = (finding.display_name || "").trim();
  const cve = (finding.cve_id || "").trim().toUpperCase();

  if (!raw) {
    return cve || `Finding ${finding.id}`;
  }
  if (!cve) {
    return raw;
  }

  const suffixPattern = new RegExp(`:\\s*${cve}$`, "i");
  const exactPattern = new RegExp(`^${cve}$`, "i");

  if (suffixPattern.test(raw)) {
    const stripped = raw.replace(suffixPattern, "").trim();
    if (stripped) return stripped;
  }
  if (exactPattern.test(raw)) {
    return cve;
  }
  return raw;
}

function getAssetName(asset: AssetSummary) {
  return asset.hostname ?? asset.asset_id;
}

function getAssetType(asset: AssetSummary) {
  return formatText(asset.device_type);
}

function AssetStatusBadge({ status }: { status?: string | null }) {
  const normalized = deriveAssetStatus(status);
  return <Tag tone={normalized === "Active" ? "success" : "neutral"}>{normalized}</Tag>;
}

function AssetComplianceBadges({ asset }: { asset: AssetSummary }) {
  const badges = getComplianceBadges(asset);
  if (badges.length === 0) {
    return <span className="text-slate-500">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Tag key={badge} tone={badge === "PCI" || badge === "PII" ? "warn" : "neutral"}>
          {badge}
        </Tag>
      ))}
    </div>
  );
}

function getComplianceBadges(asset: AssetSummary) {
  const badges = new Set<string>();
  if (asset.pci) badges.add("PCI");
  if (asset.pii) badges.add("PII");
  const rawFlags = (asset.compliance_flags ?? "")
    .split(/[;,|]/)
    .map((value) => value.trim())
    .filter(Boolean);
  rawFlags.forEach((flag) => {
    const normalized = flag.toUpperCase();
    if (normalized !== "PCI" && normalized !== "PII") {
      badges.add(normalized);
    }
  });
  return Array.from(badges);
}

function formatEnvironment(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCategory(value?: string | null) {
  return formatText(value);
}

function deriveAssetStatus(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized && /fixed|closed|resolved|inactive|retired/.test(normalized)) {
    return "Not active";
  }
  if (normalized && /active|open|new/.test(normalized)) {
    return "Active";
  }
  return "Not active";
}

function formatNullable(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

function formatText(value?: string | null) {
  return value && value.trim() ? value : "—";
}

function riskBandWeight(value?: string | null) {
  switch ((value ?? "").toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function bandPillClass(band?: string | null) {
  const value = (band || "").toLowerCase();
  if (value === "critical") return "bg-rose-100 text-rose-700";
  if (value === "high") return "bg-orange-100 text-orange-700";
  if (value === "medium") return "bg-amber-100 text-amber-700";
  if (value === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
}
