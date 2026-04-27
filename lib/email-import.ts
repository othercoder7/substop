import { supabase } from '@/lib/supabase';

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

function isMissingImportTableError(message: string) {
  return (
    message.includes('import_connections') ||
    message.includes('import_candidates') ||
    message.includes('schema cache')
  );
}

export async function fetchImportConnections(userId: string) {
  const { data, error } = await supabase
    .from('import_connections')
    .select('*')
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
