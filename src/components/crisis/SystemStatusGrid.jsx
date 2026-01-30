import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertCircle, CheckCircle, Clock, Server } from "lucide-react";

export default function SystemStatusGrid({ systems, onSystemClick }) {
  const statusConfig = {
    operational: { color: "bg-green-500", icon: CheckCircle, label: "Operational" },
    degraded: { color: "bg-yellow-500", icon: AlertCircle, label: "Degraded" },
    compromised: { color: "bg-red-500", icon: AlertCircle, label: "Compromised" },
    offline: { color: "bg-gray-500", icon: AlertCircle, label: "Offline" },
    reconstituting: { color: "bg-blue-500", icon: Clock, label: "Reconstituting" },
    verified: { color: "bg-green-600", icon: CheckCircle, label: "Verified" }
  };

  const typeIcons = {
    healthcare: "🏥",
    power_grid: "⚡",
    water: "💧",
    telecommunications: "📡",
    emergency_services: "🚨",
    financial: "🏦",
    transportation: "🚆",
    government: "🏛️"
  };

  const groupByRegion = (systems) => {
    const grouped = {};
    systems.forEach(sys => {
      if (!grouped[sys.region]) grouped[sys.region] = [];
      grouped[sys.region].push(sys);
    });
    return grouped;
  };

  const grouped = groupByRegion(systems);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([region, regionSystems]) => (
        <Card key={region}>
          <CardHeader>
            <CardTitle className="text-lg capitalize flex items-center gap-2">
              <Server className="h-5 w-5" />
              {region.replace(/_/g, ' ')}
              <Badge variant="outline" className="ml-auto">
                {regionSystems.length} systems
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {regionSystems.map(system => {
                const statusInfo = statusConfig[system.status] || statusConfig.offline;
                const StatusIcon = statusInfo.icon;

                return (
                  <Button
                    key={system.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start hover:bg-gray-50 transition-all"
                    onClick={() => onSystemClick(system)}
                  >
                    <div className="flex items-center gap-2 w-full mb-2">
                      <span className="text-2xl">{typeIcons[system.system_type]}</span>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">{system.system_name}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {system.system_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className={`h-3 w-3 rounded-full ${statusInfo.color} animate-pulse`} />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusInfo.label}</span>
                    </div>
                    {system.population_affected > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        👥 {system.population_affected.toLocaleString()} affected
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}