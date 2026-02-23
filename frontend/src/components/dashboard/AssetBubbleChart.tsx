import React, { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import * as Highcharts from "highcharts";
import "highcharts/highcharts-more"; 
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { getAssetVulnerabilityCounts, AssetVulnCount } from "../../api";

// Initialize Highcharts modules


export function AssetBubbleChart() {
  const [data, setData] = useState<AssetVulnCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            VULNERABILITIES BY ASSET
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-xs text-slate-400">
            {loading ? "Loading chart..." : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-slate-500">
            VULNERABILITIES BY ASSET
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[400px] items-center justify-center">
          <p className="text-xs text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Highcharts packed bubble chart - show top 7 assets only
  const chartData = data.slice(0, 7).map((asset) => ({
    name: asset.hostname || asset.asset_id,
    value: asset.vuln_count,
    risk: asset.total_risk,
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "packedbubble",
      height: 400,
      backgroundColor: "transparent",
    },
    title: {
      text: undefined,
    },
    tooltip: {
      useHTML: true,
      pointFormatter: function (this: any) {
        return `<b>${this.name}</b><br/>Vulnerabilities: ${this.value}<br/>Total Risk: ${this.risk.toFixed(1)}`;
      },
    },
    plotOptions: {
      packedbubble: {
        minSize: "30%",
        maxSize: "120%",
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
            textOutline: "1px contrast",
            fontWeight: "normal",
            fontSize: "11px",
          },
        },
      },
    },
    series: [
      {
        type: "packedbubble",
        name: "Assets",
        data: chartData,
        color: "#3b82f6",
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
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-slate-500">
          VULNERABILITIES BY ASSET
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}
