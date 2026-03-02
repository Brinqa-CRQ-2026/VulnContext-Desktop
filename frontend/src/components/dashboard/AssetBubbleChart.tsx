import React, { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import * as Highcharts from "highcharts";
import "highcharts/highcharts-more"; 
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getAssetVulnerabilityCounts, AssetVulnCount } from "../../api";
import { AssetVulnerabilitiesModal } from "./AssetVulnerabilitiesModal";

// Initialize Highcharts modules


export function AssetBubbleChart() {
  const [data, setData] = useState<AssetVulnCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<{
    assetId: string;
    assetName: string | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await getAssetVulnerabilityCounts();
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load asset data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <Card className="col-span-full shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Vulnerabilities by Asset
          </CardTitle>
          <p className="text-xs text-slate-500">
            Top assets by vulnerability count
          </p>
        </CardHeader>
        <CardContent className="flex h-[500px] items-center justify-center">
          <p className="text-sm text-slate-400">
            {loading ? "Loading chart..." : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Vulnerabilities by Asset
          </CardTitle>
          <p className="text-xs text-slate-500">
            Top assets by vulnerability count
          </p>
        </CardHeader>
        <CardContent className="flex h-[500px] items-center justify-center">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Highcharts packed bubble chart - show top 10 assets
  const chartData = data.slice(0, 10).map((asset, index) => {
    // Calculate color based on risk score (smooth gradient from green to red)
    const maxRisk = Math.max(...data.slice(0, 10).map(a => a.total_risk));
    const minRisk = Math.min(...data.slice(0, 10).map(a => a.total_risk));
    
    // Normalize risk to 0-1 scale
    const riskRatio = maxRisk === minRisk ? 0.5 : (asset.total_risk - minRisk) / (maxRisk - minRisk);
    
    // Create a smooth gradient: green -> yellow -> orange -> red
    let r, g, b;
    
    if (riskRatio < 0.33) {
      // Green to Yellow
      const t = riskRatio / 0.33;
      r = Math.round(16 + (251 - 16) * t);   // 16 -> 251
      g = Math.round(185 + (191 - 185) * t); // 185 -> 191
      b = Math.round(129 - 129 * t);          // 129 -> 0
    } else if (riskRatio < 0.66) {
      // Yellow to Orange
      const t = (riskRatio - 0.33) / 0.33;
      r = Math.round(251 + (251 - 251) * t);  // 251 -> 251
      g = Math.round(191 + (146 - 191) * t);  // 191 -> 146
      b = Math.round(0);                       // 0 -> 0
    } else {
      // Orange to Red
      const t = (riskRatio - 0.66) / 0.34;
      r = Math.round(251 + (239 - 251) * t);  // 251 -> 239
      g = Math.round(146 - 146 * t);           // 146 -> 0
      b = Math.round(0 + (68 - 0) * t);        // 0 -> 68
    }
    
    const color = `rgb(${r}, ${g}, ${b})`;
    
    return {
      name: asset.hostname || asset.asset_id,
      value: asset.vuln_count,
      risk: asset.total_risk,
      assetId: asset.asset_id,
      color: color,
    };
  });

  const options: Highcharts.Options = {
    chart: {
      type: "packedbubble",
      height: 500,
      backgroundColor: "transparent",
    },
    title: {
      text: undefined,
    },
    tooltip: {
      useHTML: true,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderWidth: 1,
      borderColor: '#e2e8f0',
      borderRadius: 8,
      shadow: {
        color: 'rgba(0, 0, 0, 0.1)',
        offsetX: 0,
        offsetY: 2,
        opacity: 0.5,
        width: 4
      },
      style: {
        padding: '12px',
      },
      pointFormatter: function (this: any) {
        return `
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-weight: 600; font-size: 13px; color: #0f172a; margin-bottom: 8px;">${this.name}</div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.6;">
              <div><span style="font-weight: 500;">Vulnerabilities:</span> ${this.value}</div>
              <div><span style="font-weight: 500;">Total Risk Score:</span> ${this.risk.toFixed(1)}</div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-style: italic;">
              Click to view details
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      packedbubble: {
        minSize: "20%",
        maxSize: "150%",
        layoutAlgorithm: {
          gravitationalConstant: 0.05,
          splitSeries: false,
          seriesInteraction: false,
          dragBetweenSeries: false,
          parentNodeLimit: true,
        },
        dataLabels: {
          enabled: true,
          format: "{point.name}",
          style: {
            color: "white",
            textOutline: "2px contrast",
            fontWeight: "600",
            fontSize: "12px",
          },
          filter: {
            property: 'value',
            operator: '>',
            value: 2
          }
        },
        cursor: "pointer",
        states: {
          hover: {
            brightness: 0.1,
          }
        },
        point: {
          events: {
            click: function (this: any) {
              const point = this;
              setSelectedAsset({
                assetId: point.assetId,
                assetName: point.name,
              });
            },
          },
        },
      },
    },
    series: [
      {
        type: "packedbubble",
        name: "Assets",
        data: chartData.map(item => ({
          ...item,
          color: item.color,
        })),
      },
    ],
    legend: {
      enabled: false,
    },
    credits: {
      enabled: false,
    },
  };

  return (
    <Card className="col-span-full shadow-md border-slate-200/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Vulnerabilities by Asset
        </CardTitle>
        <p className="text-xs text-slate-500">
          Top assets by vulnerability count • Click any bubble to view details
        </p>
      </CardHeader>
      <CardContent className="h-[500px] pt-2">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>

      {selectedAsset && (
        <AssetVulnerabilitiesModal
          assetId={selectedAsset.assetId}
          assetName={selectedAsset.assetName}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </Card>
  );
}
