import {
  AdminHealth,
  AdminInvite,
  AdminSubmissionItem,
  AdminSystemSettings,
  AuditEvent,
  BlacklistEntry,
  LeaderboardsData,
  SubmissionForm,
  SubmissionLogDetail,
  SubmissionResponse,
  SubmissionStatusDetail,
} from '../types';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed with status ${response.status}`);
  }
  if (payload === null) {
    throw new Error('Expected JSON response from API.');
  }
  return payload as T;
}

export async function fetchLeaderboards(): Promise<LeaderboardsData> {
  return parseResponse<LeaderboardsData>(await fetch('/api/leaderboards'));
}

export async function submitTrajectory(
  form: SubmissionForm,
  file: File
): Promise<SubmissionResponse> {
  const body = new FormData();
  body.set('invite_code', form.inviteCode || '');
  body.set('contact_email', form.contactEmail);
  body.set('team', form.team);
  body.set('method', form.method);
  body.set('category', form.category);
  body.set('training_runs', form.trainingRuns);
  body.set('link', form.link);
  body.set('notes', form.notes);
  body.set('trajectory', file);
  return parseResponse<SubmissionResponse>(
    await fetch('/api/submissions', { method: 'POST', body })
  );
}

export async function fetchSubmission(
  id: string,
  token: string
): Promise<SubmissionStatusDetail> {
  return parseResponse<SubmissionStatusDetail>(
    await fetch(`/api/submissions/${id}?token=${encodeURIComponent(token)}`)
  );
}

// --- ADMIN API HELPERS ---
export async function fetchAdminHealth(token: string): Promise<AdminHealth> {
  return parseResponse<AdminHealth>(
    await fetch('/api/admin/health', { headers: adminHeaders(token) })
  );
}

export async function fetchAdminSubmissions(token: string): Promise<AdminSubmissionItem[]> {
  return parseResponse<AdminSubmissionItem[]>(
    await fetch('/api/admin/submissions', { headers: adminHeaders(token) })
  );
}

export async function fetchAdminInvites(token: string): Promise<AdminInvite[]> {
  return parseResponse<AdminInvite[]>(
    await fetch('/api/admin/invites', { headers: adminHeaders(token) })
  );
}

export async function createInvite(token: string, teamLabel: string): Promise<AdminInvite & { code: string }> {
  return parseResponse<AdminInvite & { code: string }>(
    await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_label: teamLabel }),
    })
  );
}

export async function disableInvite(token: string, inviteId: string): Promise<AdminInvite> {
  return parseResponse<AdminInvite>(
    await fetch(`/api/admin/invites/${inviteId}/disable`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  );
}

export async function publishSubmission(token: string, submissionId: string): Promise<AdminSubmissionItem> {
  return moderateSubmission(token, submissionId, 'publish');
}

export async function hideSubmission(token: string, submissionId: string): Promise<AdminSubmissionItem> {
  return moderateSubmission(token, submissionId, 'hide');
}

export async function retrySubmission(token: string, submissionId: string): Promise<AdminSubmissionItem> {
  return parseResponse<AdminSubmissionItem>(
    await fetch(`/api/admin/submissions/${submissionId}/retry`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  );
}

export async function deleteSubmission(token: string, submissionId: string): Promise<{ status: string }> {
  return parseResponse<{ status: string }>(
    await fetch(`/api/admin/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: adminHeaders(token),
    })
  );
}

export async function toggleBaseline(token: string, submissionId: string): Promise<AdminSubmissionItem> {
  return parseResponse<AdminSubmissionItem>(
    await fetch(`/api/admin/submissions/${submissionId}/baseline`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  );
}

export async function fetchSubmissionLogs(token: string, submissionId: string): Promise<SubmissionLogDetail> {
  return parseResponse<SubmissionLogDetail>(
    await fetch(`/api/admin/submissions/${submissionId}/logs`, {
      headers: adminHeaders(token),
    })
  );
}

export async function resetTeamQuota(
  token: string,
  contactEmail: string,
  category: string = 'lidar',
  additionalAttempts: number = 5
): Promise<{ contact_email: string; category: string; new_limit: number }> {
  return parseResponse<{ contact_email: string; category: string; new_limit: number }>(
    await fetch('/api/admin/quotas/reset', {
      method: 'POST',
      headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_email: contactEmail,
        category,
        additional_attempts: additionalAttempts,
      }),
    })
  );
}

export async function fetchBlacklist(token: string): Promise<BlacklistEntry[]> {
  return parseResponse<BlacklistEntry[]>(
    await fetch('/api/admin/blacklist', { headers: adminHeaders(token) })
  );
}

export async function addBlacklist(
  token: string,
  entryType: 'email' | 'ip',
  value: string,
  reason: string = ''
): Promise<BlacklistEntry> {
  return parseResponse<BlacklistEntry>(
    await fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_type: entryType, value, reason }),
    })
  );
}

export async function deleteBlacklist(token: string, id: string): Promise<{ status: string }> {
  return parseResponse<{ status: string }>(
    await fetch(`/api/admin/blacklist/${id}`, {
      method: 'DELETE',
      headers: adminHeaders(token),
    })
  );
}

export async function fetchSystemSettings(token: string): Promise<AdminSystemSettings> {
  return parseResponse<AdminSystemSettings>(
    await fetch('/api/admin/system/settings', { headers: adminHeaders(token) })
  );
}

export async function updateSystemSetting(
  token: string,
  key: string,
  value: string
): Promise<{ key: string; value: string }> {
  return parseResponse<{ key: string; value: string }>(
    await fetch('/api/admin/system/settings', {
      method: 'POST',
      headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  );
}

export async function fetchAuditLogs(token: string): Promise<AuditEvent[]> {
  return parseResponse<AuditEvent[]>(
    await fetch('/api/admin/audit-logs', { headers: adminHeaders(token) })
  );
}

async function moderateSubmission(
  token: string,
  submissionId: string,
  action: 'publish' | 'hide'
): Promise<AdminSubmissionItem> {
  return parseResponse<AdminSubmissionItem>(
    await fetch(`/api/admin/submissions/${submissionId}/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
    })
  );
}

function adminHeaders(token: string): Record<string, string> {
  return { 'X-Admin-Token': token };
}
