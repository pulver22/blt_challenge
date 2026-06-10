async function parseResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed with status ${response.status}`);
  }
  if (payload === null) {
    throw new Error('Expected JSON response from API.');
  }
  return payload;
}

export async function fetchLeaderboards() {
  return parseResponse(await fetch('/api/leaderboards'));
}

export async function submitTrajectory(form, file) {
  const body = new FormData();
  body.set('invite_code', form.inviteCode);
  body.set('contact_email', form.contactEmail);
  body.set('team', form.team);
  body.set('method', form.method);
  body.set('category', form.category);
  body.set('training_runs', form.trainingRuns);
  body.set('link', form.link);
  body.set('notes', form.notes);
  body.set('trajectory', file);
  return parseResponse(await fetch('/api/submissions', { method: 'POST', body }));
}

export async function fetchSubmission(id, token) {
  return parseResponse(await fetch(`/api/submissions/${id}?token=${encodeURIComponent(token)}`));
}

export async function fetchAdminHealth(token) {
  return parseResponse(await fetch('/api/admin/health', { headers: adminHeaders(token) }));
}

export async function fetchAdminSubmissions(token) {
  return parseResponse(await fetch('/api/admin/submissions', { headers: adminHeaders(token) }));
}

export async function fetchAdminInvites(token) {
  return parseResponse(await fetch('/api/admin/invites', { headers: adminHeaders(token) }));
}

export async function createInvite(token, teamLabel) {
  return parseResponse(
    await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { ...adminHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_label: teamLabel }),
    }),
  );
}

export async function disableInvite(token, inviteId) {
  return parseResponse(
    await fetch(`/api/admin/invites/${inviteId}/disable`, {
      method: 'POST',
      headers: adminHeaders(token),
    }),
  );
}

export async function publishSubmission(token, submissionId) {
  return moderateSubmission(token, submissionId, 'publish');
}

export async function hideSubmission(token, submissionId) {
  return moderateSubmission(token, submissionId, 'hide');
}

async function moderateSubmission(token, submissionId, action) {
  return parseResponse(
    await fetch(`/api/admin/submissions/${submissionId}/${action}`, {
      method: 'POST',
      headers: adminHeaders(token),
    }),
  );
}

function adminHeaders(token) {
  return { 'X-Admin-Token': token };
}
