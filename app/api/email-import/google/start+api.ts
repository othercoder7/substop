import { createSupabaseUserClient } from '@/lib/server-supabase';

function encodeState(data: Record<string, string>) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appRedirectUri = url.searchParams.get('app_redirect_uri');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!clientId) {
    return Response.json({ error: 'Missing GOOGLE_CLIENT_ID.' }, { status: 500 });
  }

  if (!appRedirectUri) {
    return Response.json({ error: 'Missing app_redirect_uri.' }, { status: 400 });
  }

  if (!accessToken) {
    return Response.json({ error: 'Missing Supabase access token.' }, { status: 401 });
  }

  const supabase = createSupabaseUserClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Could not verify the signed-in user.' }, { status: 401 });
  }

  const { data: connection, error: insertError } = await supabase
    .from('import_connections')
    .insert({
      user_id: user.id,
      provider: 'gmail',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !connection) {
    return Response.json(
      { error: insertError?.message ?? 'Could not create import connection.' },
      { status: 500 }
    );
  }

  const callbackUrl = `${url.origin}/api/email-import/google/callback`;
  const state = encodeState({
    appRedirectUri,
    connectionId: connection.id,
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
  authUrl.searchParams.set('state', state);

  return Response.json({ authUrl: authUrl.toString() });
}
