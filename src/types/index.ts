export type CategoryId = 'lidar' | 'vision' | 'combined';

export interface LeaderboardEntry {
  submission_id: string;
  rank: number;
  team: string;
  method: string;
  category: CategoryId;
  ate_rmse: number;
  rpe_rmse: number;
  alignment: string;
  attempt_number: number;
  is_baseline?: number;
  published_at?: string;
  contact_email?: string;
  training_runs?: string;
  link?: string;
  notes?: string;
}

export type LeaderboardsData = Record<CategoryId, LeaderboardEntry[]>;

export interface SubmissionForm {
  inviteCode?: string;
  contactEmail: string;
  team: string;
  method: string;
  category: CategoryId;
  trainingRuns: string;
  link: string;
  notes: string;
}

export interface SubmissionResponse {
  submission_id: string;
  attempt_number: number;
  remaining_attempts: number;
  status_url: string;
  token?: string;
}

export interface SubmissionStatusDetail {
  id: string;
  team: string;
  method: string;
  category: CategoryId;
  attempt_number: number;
  is_baseline?: number;
  status: 'queued' | 'running' | 'evaluating' | 'published' | 'pending_review' | 'failed_evo' | 'failed_validation' | 'rejected';
  publication_state: 'draft' | 'published' | 'hidden' | 'private' | 'pending_review';
  updated_at: string;
  created_at: string;
  result?: {
    ate_rmse: number;
    rpe_rmse: number;
    alignment: string;
  };
}

export interface AdminHealth {
  queue_length: number;
  ground_truth_available: boolean;
  evo_available: boolean;
  disk_bytes: number;
  submissions_frozen?: boolean;
}

export interface AdminInvite {
  id: string;
  team_label: string;
  code_hash: string;
  active: boolean;
  created_at: string;
}

export interface AdminSubmissionItem extends SubmissionStatusDetail {
  contact_email: string;
}

export interface ChallengeMeta {
  name: string;
  datasetUrl: string;
  publicationUrl: string;
  publicationTitle: string;
  paperCitation: string;
  evoUrl: string;
  officialRun: {
    id: string;
    name: string;
    season: string;
    description: string;
  };
  acceptedFormats: Array<{
    id: string;
    label: string;
    extension: string;
  }>;
}

export interface TrajectoryValidation {
  valid: boolean;
  message: string;
}

export interface BlacklistEntry {
  id: string;
  entry_type: 'email' | 'ip';
  value: string;
  reason: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: string;
  created_at: string;
}

export interface AdminSystemSettings {
  submissions_frozen: boolean;
  active_target_name: string;
}

export interface SubmissionLogDetail {
  submission: SubmissionStatusDetail;
  failure_log: string;
  upload_path?: string;
}
