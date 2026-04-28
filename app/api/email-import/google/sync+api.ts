import { createSupabaseAdminClient, createSupabaseUserClient } from '@/lib/server-supabase';
import { buildImportCandidatesForConnection } from '@/lib/email-import-server';

type SyncRequestBody = {
  connectionId?: string;
};

export async function POST(request: Request) {
  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!accessToken) {
    return Response.json({ error: 'Missing Supabase access token.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as SyncRequestBody;

  if (!body.connectionId) {
    return Response.json({ error: 'Missing connectionId.' }, { status: 400 });
  }

  const supabase = createSupabaseUserClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Could not verify the signed-in user.' }, { status: 401 });
  }

  const { data: ownedConnection, error: ownedConnectionError } = await supabase
    .from('import_connections')
    .select('id, user_id, connected_email, status')
    .eq('id', body.connectionId)
    .eq('user_id', user.id)
    .single();

  if (ownedConnectionError || !ownedConnection) {
    return Response.json({ error: 'Could not find that Gmail connection.' }, { status: 404 });
  }

  if (ownedConnection.status !== 'connected') {
    return Response.json({ error: 'Reconnect Gmail before syncing this inbox.' }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('import_connections')
    .select(
      'id, user_id, connected_email, access_token, refresh_token, token_expires_at'
    )
    .eq('id', body.connectionId)
    .single();

  if (connectionError || !connection) {
    return Response.json(
      { error: connectionError?.message ?? 'Could not load Gmail connection.' },
      { status: 500 }
    );
  }

  try {
    const { candidates, token, scannedCount } = await buildImportCandidatesForConnection(connection);

    if (token.refreshed) {
      await supabaseAdmin
        .from('import_connections')
        .update({
          access_token: token.accessToken,
          refresh_token: token.refreshToken,
          token_expires_at: token.expiresAt,
          error_message: null,
        })
        .eq('id', connection.id);
    }

    if (candidates.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('import_candidates')
        .upsert(candidates, { onConflict: 'user_id,source_message_id' });

      if (upsertError) {
        throw upsertError;
      }
    }

    const { error: connectionUpdateError } = await supabaseAdmin
      .from('import_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', connection.id);

    if (connectionUpdateError) {
      throw connectionUpdateError;
    }

    return Response.json({
      scannedCount,
      candidateCount: candidates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong during Gmail sync.';

    await supabaseAdmin
      .from('import_connections')
      .update({
        error_message: message,
      })
      .eq('id', connection.id);

    return Response.json({ error: message }, { status: 500 });
  }
}
