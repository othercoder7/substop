import { supabase } from '@/lib/supabase';
import type { BillingCycle } from '@/lib/subscriptions';

export type ImportProvider = 'gmail';
export type ImportConnectionStatus = 'pending' | 'connected' | 'error' | 'revoked';
export type ImportCandidateStatus = 'pending' | 'approved' | 'rejected';

export type ImportConnection = {
  id: string;
  user_id: string;
  provider: ImportProvider;
  status: ImportConnectionStatus;
  connected_email: string | null;
  external_account_id: string | null;
  scopes: string[];
  last_synced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ImportCandidate = {
  id: string;
  user_id: string;
  connection_id: string | null;
  source_message_id: string;
  merchant_name: string;
  normalized_name: string | null;
  amount: number | null;
  currency_code: string | null;
  billing_cycle: string | null;
  renewal_date: string | null;
  status: ImportCandidateStatus;
  raw_subject: string | null;
  raw_from: string | null;
  raw_snippet: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
};

type CandidateSubscriptionDraft = {
  amount: number;
  renewalDate: string;
  billingCycle?: BillingCycle | null;
};

function isMissingImportTableError(message: string) {
  return (
    message.includes('import_connections') ||
    message.includes('import_candidates') ||
    message.includes('schema cache')
  );
}

function getApiBaseUrl() {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  return '';
}

export async function fetchImportConnections(userId: string) {
  const { data, error } = await supabase
    .from('import_connections')
    .select(
      'id, user_id, provider, status, connected_email, external_account_id, scopes, last_synced_at, error_message, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingImportTableError(error.message)) {
      return [] as ImportConnection[];
    }

    throw error;
  }

  return (data ?? []) as ImportConnection[];
}

export async function fetchImportCandidates(userId: string) {
  const { data, error } = await supabase
    .from('import_candidates')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false });

  if (error) {
    if (isMissingImportTableError(error.message)) {
      return [] as ImportCandidate[];
    }

    throw error;
  }

  return (data ?? []) as ImportCandidate[];
}

export async function syncImportConnection(connectionId: string, accessToken: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/email-import/google/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ connectionId }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    scannedCount?: number;
    candidateCount?: number;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? 'Could not sync Gmail inbox.');
  }

  return {
    scannedCount: payload.scannedCount ?? 0,
    candidateCount: payload.candidateCount ?? 0,
  };
}

export async function rejectImportCandidate(candidateId: string) {
  const { error } = await supabase
    .from('import_candidates')
    .update({ status: 'rejected' })
    .eq('id', candidateId);

  if (error) {
    throw error;
  }
}

export async function createSubscriptionFromImportCandidate(
  candidate: ImportCandidate,
  draft: CandidateSubscriptionDraft
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user?.id) {
    throw new Error('You need to be signed in to add subscriptions.');
  }

  const { error: insertError } = await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: candidate.merchant_name,
    provider: candidate.raw_from,
    amount: draft.amount,
    renewal_date: draft.renewalDate,
    billing_cycle: draft.billingCycle ?? 'monthly',
    notes: candidate.raw_subject ?? candidate.raw_snippet,
  });

  if (insertError) {
    throw insertError;
  }

  const { error: updateError } = await supabase
    .from('import_candidates')
    .update({ status: 'approved' })
    .eq('id', candidate.id);

  if (updateError) {
    throw updateError;
  }
}
