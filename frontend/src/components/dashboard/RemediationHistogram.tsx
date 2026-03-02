import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useRemediationTimeHistogram } from "../../hooks/useScoresData";

export function RemediationHistogram() {
  const { data, loading, error } = useRemediationTimeHistogram();

  if (loading) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Remediation Time Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            How long it takes to fix vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[340px] items-center justify-center text-slate-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Remediation Time Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            How long it takes to fix vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[340px] items-center justify-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-md border-slate-200/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Remediation Time Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            How long it takes to fix vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[340px] items-center justify-center text-slate-500">
            No resolved vulnerabilities yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-slate-200/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm font-semibold text-slate-700">
          Remediation Time Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Days to fix resolved vulnerabilities
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[340px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              dataKey="bucket_label"
              className="text-xs"
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string, props: any) => {
                if (name === "count") {
                  return [`${value} vulnerabilities (${props.payload.percentage}%)`, "Count"];
                }
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Bar
              dataKey="count"
              name="Resolved Vulnerabilities"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
