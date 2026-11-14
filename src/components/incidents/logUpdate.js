import { base44 } from '@/api/base44Client';

// Appends an entry to an incident's timeline, stamped with the current user.
export async function logUpdate(incident_id, entry) {
  const user = await base44.auth.me();
  return base44.entities.IncidentUpdate.create({ incident_id, actor_email: user.email, ...entry });
}