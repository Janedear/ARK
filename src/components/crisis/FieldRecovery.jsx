import React from 'react';
export default function FieldRecovery({ tasks, systems, onExecuteTask }) {
  const sorted = [...tasks].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  const complete = tasks.filter(t => t.status === 'complete').length;
  return <section><h2 className="fo-h2"><i>02</i>Recovery Queue (Prioritized by Civilian Harm-Hours)<em>{complete} / {tasks.length} Complete</em></h2>
    <div className="fo-card"><div className="fo-prog"><div style={{ width: `${tasks.length ? complete / tasks.length * 100 : 0}%` }} /></div>
      {sorted.slice(0, 10).map((task, index) => <div className="fo-task" key={task.id}>
        <div className="fo-num">{index + 1}</div><div className="fo-tb"><div className="fo-tt">{task.task_title}</div><div className="fo-tm">
          {task.system_id && <span>{systems.find(s => s.id === task.system_id)?.system_name || task.system_id}</span>}
          {task.harm_hours > 0 && <span className="fo-chip fo-risk">{Math.round(task.harm_hours)} harm-hours</span>}
          {!!task.priority_score && <span className="fo-chip">Priority: {Math.round(task.priority_score)}</span>}
        </div></div><span className="fo-q">{task.status?.replace(/_/g, ' ')}</span>
        {task.status === 'queued' && !task.blocked_by?.length && <button className="fo-btn fo-sm" onClick={() => onExecuteTask(task)}>Execute</button>}
        {task.blocked_by?.length > 0 && <span className="fo-blk">Blocked by {task.blocked_by.length}</span>}
      </div>)}
    </div>
  </section>;
}