import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Filter, Download, Shield, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export default function AuditViewer() {
  const [filterType, setFilterType] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100)
  });

  const filteredLogs = auditLogs.filter(log => {
    if (filterType !== 'all' && log.action_type !== filterType) return false;
    if (filterRegion !== 'all' && log.region !== filterRegion) return false;
    return true;
  });

  const actionTypeColors = {
    system_reconstituted: 'bg-green-100 text-green-700',
    trust_reset: 'bg-blue-100 text-blue-700',
    authority_granted: 'bg-purple-100 text-purple-700',
    authority_revoked: 'bg-red-100 text-red-700',
    incident_declared: 'bg-orange-100 text-orange-700',
    incident_resolved: 'bg-green-100 text-green-700',
    priority_changed: 'bg-yellow-100 text-yellow-700',
    baseline_updated: 'bg-blue-100 text-blue-700'
  };

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Actor', 'Action Type', 'Details', 'Outcome', 'Region'].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.actor_email,
        log.action_type,
        `"${log.action_details}"`,
        log.outcome,
        log.region || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Audit log exported');
  };

  return (
    <div className="fo-screen">
      <div className="fo-container space-y-6">
        {/* Header */}
        <div className="fo-page-header">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              Activity log
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review saved actions, their actors, and recorded outcomes alongside original evidence.
            </p>
          </div>

          <Button onClick={exportAuditLog} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Integrity Notice */}
        <Card className="border-border bg-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-muted-foreground" />
              <div>
                <div className="font-bold text-foreground">
                  Application activity records
                </div>
                <div className="text-sm text-muted-foreground">
                  {auditLogs.length} recent records loaded. Independent integrity verification is not implemented.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="w-64">
                <Label className="text-xs">Action Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="system_reconstituted">System Reconstituted</SelectItem>
                    <SelectItem value="trust_reset">Trust Reset</SelectItem>
                    <SelectItem value="authority_granted">Authority Granted</SelectItem>
                    <SelectItem value="authority_revoked">Authority Revoked</SelectItem>
                    <SelectItem value="incident_declared">Incident Declared</SelectItem>
                    <SelectItem value="incident_resolved">Incident Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-48">
                <Label className="text-xs">Region</Label>
                <Select value={filterRegion} onValueChange={setFilterRegion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="region_a">Region A</SelectItem>
                    <SelectItem value="region_b">Region B</SelectItem>
                    <SelectItem value="region_c">Region C</SelectItem>
                    <SelectItem value="region_d">Region D</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Badge variant="outline" className="h-10 px-3 flex items-center">
                  Showing {filteredLogs.length} of {auditLogs.length} entries
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recorded activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-all"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-mono text-xs text-indigo-700">
                      #{auditLogs.length - idx}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={actionTypeColors[log.action_type] || 'bg-gray-100 text-gray-700'}>
                          {log.action_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.created_date), 'MMM d, yyyy HH:mm:ss')}
                        </span>
                      </div>

                      <div className="text-sm mt-1 text-gray-900">
                        {log.action_details}
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                        <span>Actor: <span className="font-medium">{log.actor_email}</span></span>
                        {log.region && (
                          <>
                            <span>•</span>
                            <span className="capitalize">Region: {log.region.replace(/_/g, ' ')}</span>
                          </>
                        )}
                        {log.authority_id && (
                          <>
                            <span>•</span>
                            <span>Auth: {log.authority_id.substring(0, 8)}...</span>
                          </>
                        )}
                      </div>
                    </div>

                    {log.outcome === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : log.outcome === 'failure' ? (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No audit entries matching filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}