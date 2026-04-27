import { createSupabaseAdminClient } from '@/lib/server-supabase';

function decodeState(encoded: string | null) {
  if (!encoded) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      appRedirectUri?: string;
      connectionId?: string;
    };
  } catch {
    return null;
  }
}

function redirectToApp(appRedirectUri: string, status: 'success' | 'error', message?: string) {
  const redirectUrl = new URL(appRedirectUri);
  redirectUrl.searchParams.set('status', status);

  if (message) {
    redirectUrl.searchParams.set('message', message);
  }

  return Response.redirect(redirectUrl.toString(), 302);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = decodeState(url.searchParams.get('state'));
  const appRedirectUri = state?.appRedirectUri;
  const connectionId = state?.connectionId;

  if (!appRedirectUri || !connectionId) {
    return Response.json({ error: 'Missing app redirect URI.' }, { status: 400 });
  }

  const code = url.searchParams.get('code');

  if (!code) {
    return redirectToApp(appRedirectUri, 'error', 'Google did not return an authorization code.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return redirectToApp(
      appRedirectUri,
      'error',
      'Google OAuth credentials are missing on the server.'
    );
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const callbackUrl = `${url.origin}/api/email-import/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || !tokenPayload.access_token) {
      const message = tokenPayload.error_description ?? tokenPayload.error ?? 'Could not exchange Gmail code.';

      await supabaseAdmin
        .from('import_connections')
        .update({
          status: 'error',
          error_message: message,
        })
        .eq('id', connectionId);

      return redirectToApp(appRedirectUri, 'error', message);
    }

    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });

    const profilePayload = (await profileResponse.json()) as {
      emailAddress?: string;
      historyId?: string;
      error?: {
        message?: string;
      };
    };

    if (!profileResponse.ok || !profilePayload.emailAddress) {
      const message = profilePayload.error?.message ?? 'Could not read Gmail profile.';

      await supabaseAdmin
        .from('import_connections')
        .update({
          status: 'error',
          error_message: message,
        })
        .eq('id', connectionId);

      return redirectToApp(appRedirectUri, 'error', message);
    }

    const scopes = tokenPayload.scope
      ? tokenPayload.scope.split(' ').filter((scope) => scope.length > 0)
      : [];

    const { error: updateError } = await supabaseAdmin
      .from('import_connections')
      .update({
        status: 'connected',
        connected_email: profilePayload.emailAddress,
        external_account_id: profilePayload.historyId ?? profilePayload.emailAddress,
        scopes,
        last_synced_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', connectionId);

    if (updateError) {
      return redirectToApp(appRedirectUri, 'error', updateError.message);
    }

    return redirectToApp(appRedirectUri, 'success');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Something went wrong during Gmail connection.';

    await supabaseAdmin
      .from('import_connections')
      .update({
        status: 'error',
        error_message: message,
      })
      .eq('id', connectionId);

    return redirectToApp(appRedirectUri, 'error', message);
  }
}
