import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, Shield, Server, Clock, AlertTriangle, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import MetricCard from '../components/dashboard/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => base44.entities.System.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list()
  });

  const { data: authorities = [] } = useQuery({
    queryKey: ['authorities'],
    queryFn: () => base44.entities.Authority.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.RecoveryTask.list()
  });

  // Calculate metrics
  const operationalSystems = systems.filter(s => s.status === 'operational').length;
  const compromisedSystems = systems.filter(s => s.status === 'compromised').length;
  const activeIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && !['resolved', 'closed'].includes(i.status)).length;
  const activeAuthorities = authorities.filter(a => a.status === 'active').length;
  const pendingTasks = tasks.filter(t => t.status === 'queued' || t.status === 'in_progress').length;

  const totalCiviliansAffected = incidents
    .filter(i => !['resolved', 'closed'].includes(i.status))
    .reduce((sum, i) => sum + (i.civilians_affected || 0), 0);

  const systemHealth = systems.length > 0 ? (operationalSystems / systems.length) * 100 : 100;

  const recentIncidents = incidents
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const severityColors = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              National Cyber Resilience Platform
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              🔒 PROTOTYPE/DEMONSTRATION SYSTEM - Not Connected to Real Infrastructure
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Activity className="h-4 w-4 mr-1 inline" />
            {activeIncidents > 0 ? 'CRISIS MODE' : 'PEACETIME READINESS'}
          </Badge>
        </div>

        {/* Alert Banner if Active Incidents */}
        {activeIncidents > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <div className="font-bold text-red-900">
                    {activeIncidents} Active Incident{activeIncidents !== 1 ? 's' : ''}
                    {criticalIncidents > 0 && ` (${criticalIncidents} Critical)`}
                  </div>
                  <div className="text-sm text-red-700">
                    {totalCiviliansAffected.toLocaleString()} civilians potentially affected
                  </div>
                </div>
                <Link to={createPageUrl('CrisisCoordination')} className="ml-auto">
                  <Button className="bg-red-600 hover:bg-red-700">
                    Manage Response
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="System Health"
            value={`${Math.round(systemHealth)}%`}
            subtitle={`${operationalSystems} / ${systems.length} operational`}
            icon={Server}
            status={systemHealth > 90 ? 'normal' : systemHealth > 70 ? 'warning' : 'critical'}
          />
          
          <MetricCard
            title="Active Incidents"
            value={activeIncidents}
            subtitle={criticalIncidents > 0 ? `${criticalIncidents} critical` : 'All non-critical'}
            icon={AlertTriangle}
            status={activeIncidents === 0 ? 'normal' : criticalIncidents > 0 ? 'critical' : 'warning'}
          />
          
          <MetricCard
            title="Active Authorities"
            value={activeAuthorities}
            subtitle="Delegated crisis powers"
            icon={Shield}
            status={activeAuthorities > 0 ? 'info' : 'normal'}
          />
          
          <MetricCard
            title="Recovery Queue"
            value={pendingTasks}
            subtitle="Tasks awaiting execution"
            icon={Clock}
            status={pendingTasks > 10 ? 'warning' : 'normal'}
          />
        </div>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentIncidents.length > 0 ? (
              <div className="space-y-3">
                {recentIncidents.map(incident => (
                  <div key={incident.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{incident.title}</span>
                        <Badge className={severityColors[incident.severity]}>
                          {incident.severity}
                        </Badge>
                        <Badge variant="outline" className="capitalize text-xs">
                          {incident.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {incident.affected_region.replace(/_/g, ' ')} • {format(new Date(incident.created_date), 'MMM d, yyyy HH:mm')}
                      </div>
                      {incident.civilians_affected > 0 && (
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {incident.civilians_affected.toLocaleString()} civilians affected
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <div className="font-medium">No Active Incidents</div>
                <div className="text-sm">System operating normally</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/CrisisCoordination">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300">
              <CardContent className="p-6 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold">Crisis Coordination</div>
                <div className="text-xs text-gray-500 mt-1">Active response & recovery</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/SystemManagement">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-green-300">
              <CardContent className="p-6 text-center">
                <Server className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="font-semibold">System Management</div>
                <div className="text-xs text-gray-500 mt-1">Baselines & reconstitution</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/AuthorityManagement">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-purple-300">
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold">Authority Management</div>
                <div className="text-xs text-gray-500 mt-1">Delegation & audit trail</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}