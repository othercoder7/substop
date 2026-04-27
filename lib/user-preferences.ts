import { supabase } from '@/lib/supabase';

export type UserPreferences = {
  user_id: string;
  renewal_notifications_enabled: boolean;
  reminder_hour: number;
  import_email_enabled: boolean;
  import_bank_enabled: boolean;
};

export const defaultUserPreferences = {
  renewal_notifications_enabled: true,
  reminder_hour: 9,
  import_email_enabled: false,
  import_bank_enabled: false,
} satisfies Omit<UserPreferences, 'user_id'>;

function isMissingRelationError(message: string) {
  return message.includes('user_preferences') || message.includes('schema cache');
}

export async function fetchUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error.message)) {
      return {
        user_id: userId,
        ...defaultUserPreferences,
      } satisfies UserPreferences;
    }

    throw error;
  }

  if (!data) {
    return {
      user_id: userId,
      ...defaultUserPreferences,
    } satisfies UserPreferences;
  }

  return data as UserPreferences;
}

export async function upsertUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id'>>
) {
  const payload = {
    user_id: userId,
    ...updates,
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserPreferences;
}
