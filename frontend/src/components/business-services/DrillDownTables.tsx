import type { PropsWithChildren } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { ApplicationSummary, AssetSummary, ScoredFinding, SortOrder } from "../../types";
import {
  deriveAssetStatus,
  formatCategory,
  formatEnvironment,
  getAssetName,
  getAssetType,
  getComplianceBadges,
} from "../../lib/assets/assetFormatters";
import { formatNumber as formatDisplayNumber } from "../../lib/formatting/numbers";
import { formatText as formatDisplayText } from "../../lib/formatting/text";
import { getNormalizedFindingTitle } from "../../lib/findings";
import { riskBandPillClass, riskBandWeight } from "../../lib/findings/findingRisk";
import {
  compareSortValues,
  toggleSort,
  type SortState,
} from "../../lib/sorting/sortState";
import { cn } from "../../lib/utils";
import type { ApplicationSortKey, AssetSortKey, FindingSortKey } from "./types";
import { Pill } from "../ui/pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export type { SortState } from "../../lib/sorting/sortState";

const formatNullable = (value?: number | null, digits = 1) =>
  formatDisplayNumber(value, digits, "—");
const formatText = (value?: string | null) => formatDisplayText(value, "—");

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
    compareSortValues(
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
        compareSortValues(
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
        compareSortValues(
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
            label={`Open ${getNormalizedFindingTitle(finding)}`}
            onClick={() => onOpenFinding(finding)}
          >
            <TableCell>
              <div className="font-medium text-slate-900">{getNormalizedFindingTitle(finding)}</div>
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
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", riskBandPillClass(finding.risk_band))}>
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
      return getNormalizedFindingTitle(finding);
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
