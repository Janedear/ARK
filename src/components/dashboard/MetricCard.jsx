import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export default function MetricCard({ title, value, subtitle, trend, icon: Icon, status = "normal" }) {
  const statusColors = {
    normal: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    critical: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200"
  };

  const iconColors = {
    normal: "text-green-600",
    warning: "text-yellow-600",
    critical: "text-red-600",
    info: "text-blue-600"
  };

  return (
    <Card className={`fo-metric ${statusColors[status]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          {Icon && <Icon className={`h-5 w-5 ${iconColors[status]}`} />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-4xl font-bold tracking-tight tabular-nums text-foreground">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className="flex items-center mt-2 text-sm">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={trend > 0 ? "text-green-600" : "text-red-600"}>
              {Math.abs(trend)}% from baseline
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}