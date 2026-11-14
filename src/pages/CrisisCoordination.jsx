import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import FieldSystems from '@/components/crisis/FieldSystems';
import FieldRecovery from '@/components/crisis/FieldRecovery';
import FieldIncidentForm from '@/components/crisis/FieldIncidentForm';
import FieldSystemDetail from '@/components/crisis/FieldSystemDetail';
import '@/components/crisis/fieldOperations.css';

export default function CrisisCoordination() {
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    incident_type: 'credential_compromise',
    severity: 'medium',
    affected_region: 'region_a',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: systems = [] } = useQuery({
    queryKey: ['systems'],
    queryFn: () => base44.entities.System.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.RecoveryTask.list()
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Create incident
      const incident = await base44.entities.Incident.create({
        ...data,
        status: 'reported',
        declared_at: new Date().toISOString()
      });

      // Create audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'incident_declared',
        action_details: `Incident "${data.title}" declared in ${data.affected_region}`,
        affected_resources: [incident.id],
        outcome: 'success',
        region: data.affected_region
      });

      return incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      queryClient.invalidateQueries(['auditLogs']);
      setShowIncidentDialog(false);
      setIncidentForm({ title: '', incident_type: 'credential_compromise', severity: 'medium', affected_region: 'region_a', description: '' });
      toast.success('Incident declared and logged');
    }
  });

  const executeTaskMutation = useMutation({
    mutationFn: async (task) => {
      const user = await base44.auth.me();
      
      // Update task status
      await base44.entities.RecoveryTask.update(task.id, {
        status: 'in_progress',
        assigned_to: user.email,
        started_at: new Date().toISOString()
      });

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete task
      await base44.entities.RecoveryTask.update(task.id, {
        status: 'complete',
        completed_at: new Date().toISOString()
      });

      // Update system status if applicable
      if (task.system_id) {
        await base44.entities.System.update(task.system_id, {
          status: 'verified',
          last_reconstitution_date: new Date().toISOString()
        });
      }

      // Create audit log
      await base44.entities.AuditLog.create({
        actor_email: user.email,
        action_type: 'system_reconstituted',
        action_details: `Completed: ${task.task_title}`,
        affected_resources: task.system_id ? [task.system_id] : [],
        outcome: 'success',
        authority_id: task.authority_id
      });

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      queryClient.invalidateQueries(['systems']);
      queryClient.invalidateQueries(['auditLogs']);
      toast.success('Recovery task completed successfully');
    }
  });

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  const detailSystem = selectedSystem || systems[0];
  const formProps = { form: incidentForm, setForm: setIncidentForm, onCancel: () => setShowIncidentDialog(false), onDeclare: () => createIncidentMutation.mutate(incidentForm) };
  const regionNames = [...new Set(systems.map(s => s.region))];
  return (
    <div className="field-page">
      <header className="fo-mission"><div><h1>Crisis Coordination Center</h1><p>Real-time incident response and system recovery coordination</p></div><button className="fo-btn" onClick={() => setShowIncidentDialog(true)}>Declare Incident</button></header>
      <div className="fo-wrap">
        <aside className="fo-idx">{['Active Incidents Requiring Response', 'Recovery Queue', ...regionNames.map(r => r.replace(/_/g, ' ')), 'Declare New Incident', 'System Detail'].map((text, index) => <div key={text}><b>{String(index + 1).padStart(2, '0')}</b>{text}</div>)}</aside>
        <div className="fo-main">
          <FieldSystems systems={systems} onSystemClick={setSelectedSystem} />
          <div className="fo-two fo-sec">
            <section><h2 className="fo-h2"><i>01</i>Active Incidents Requiring Response</h2><div className="fo-card">{activeIncidents.map(incident => <div key={incident.id} className={`fo-inc ${incident.severity === 'high' ? 'fo-high-border' : ''}`}><div><div className="fo-it">{incident.title}</div><div className="fo-im">{incident.incident_type.replace(/_/g, ' ')} • {incident.affected_region.replace(/_/g, ' ')}</div></div><span className={`fo-bd fo-severity-${incident.severity}`}>{incident.severity}</span></div>)}</div></section>
            <FieldRecovery tasks={tasks} systems={systems} onExecuteTask={task => executeTaskMutation.mutate(task)} />
          </div>
          <div className="fo-sp fo-sec">
            <section><h2 className="fo-h2"><i>{String(regionNames.length + 3).padStart(2, '0')}</i>Declare New Incident</h2><FieldIncidentForm {...formProps} /></section>
            <section><h2 className="fo-h2"><i>{String(regionNames.length + 4).padStart(2, '0')}</i>{detailSystem?.system_name || 'System Detail'}</h2><FieldSystemDetail system={detailSystem} systems={systems} /><div className="fo-brief"><img src="https://media.base44.com/images/public/697c6a76a32bbc3cd9c4736d/37447ca1a_generated_e51e3f2b.jpg" alt="Fine-line regional infrastructure drawing" /></div></section>
          </div>
        </div>
      </div>
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}><DialogContent className="field-dialog"><DialogHeader><DialogTitle className="fo-h2">Declare New Incident</DialogTitle></DialogHeader><FieldIncidentForm {...formProps} prefix="dialog" /></DialogContent></Dialog>
      {selectedSystem && <Dialog open={!!selectedSystem} onOpenChange={() => setSelectedSystem(null)}><DialogContent className="field-dialog"><DialogHeader><DialogTitle className="fo-h2">{selectedSystem.system_name}</DialogTitle></DialogHeader><FieldSystemDetail system={selectedSystem} systems={systems} /></DialogContent></Dialog>}
    </div>
  );
}