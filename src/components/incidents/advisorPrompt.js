export const buildAdvisorPrompt = (incident, actions) => `You are a defensive cyber incident response advisor supporting a national crisis coordination team. Follow NIST SP 800-61 incident handling practice. Recommend defensive, protective and recovery measures only. Never suggest offensive, retaliatory or "hack back" actions.

INCIDENT
- Title: ${incident.title}
- Type: ${incident.incident_type}
- Severity: ${incident.severity}
- Region: ${incident.affected_region}
- Current stage: ${incident.status}
- Civilians affected: ${incident.civilians_affected ?? 'unknown'}
- Description: ${incident.description || 'none provided'}

ACTIONS ALREADY PLANNED OR TAKEN
${actions.length ? actions.map((a) => `- [${a.status}] (${a.phase}) ${a.title}${a.result_notes ? ` | result: ${a.result_notes}` : ''}`).join('\n') : '- none yet'}

Respond with:
1. assessment: a 2-3 sentence plain-language read of the situation.
2. stage_readiness: whether the team looks ready to move to the next stage, and what is missing if not.
3. suggestions: 3 to 5 concrete next actions for the current stage and the one after it. Prioritize life-safety systems and reducing civilian harm. Do not repeat actions already listed. Each must be specific and doable by a response team within hours.`;

export const ADVISOR_SCHEMA = {
  type: 'object',
  properties: {
    assessment: { type: 'string' },
    stage_readiness: { type: 'string' },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          phase: { type: 'string', enum: ['analysis', 'containment', 'eradication', 'recovery', 'communication'] },
          details: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['title', 'phase', 'details'],
      },
    },
  },
  required: ['assessment', 'suggestions'],
};