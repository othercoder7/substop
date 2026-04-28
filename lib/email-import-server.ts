type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

type ImportConnectionRecord = {
  id: string;
  user_id: string;
  connected_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};

type GmailMessageListResponse = {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  error?: {
    message?: string;
  };
};

type GmailMessageResponse = {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
  };
};

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type ImportCandidateInsert = {
  user_id: string;
  connection_id: string;
  source_message_id: string;
  merchant_name: string;
  normalized_name: string | null;
  amount: number | null;
  currency_code: string | null;
  billing_cycle: BillingCycle | null;
  renewal_date: string | null;
  raw_subject: string | null;
  raw_from: string | null;
  raw_snippet: string | null;
  detected_at: string;
};

const googleTokenUrl = 'https://oauth2.googleapis.com/token';
const gmailApiBaseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
const gmailSearchQueries = [
  'category:purchases newer_than:2y',
  '"subscription" newer_than:2y',
  '"renewal" newer_than:2y',
  '"receipt" newer_than:2y',
];

const subscriptionKeywords = [
  'subscription',
  'renewal',
  'renews',
  'monthly',
  'annual',
  'yearly',
  'receipt',
  'invoice',
  'billing',
  'charged',
  'trial',
];

const genericSenderNames = new Set([
  'notifications',
  'billing',
  'receipts',
  'support',
  'no-reply',
  'noreply',
  'mail',
  'team',
]);

const currencySymbolMap: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function getHeaderValue(
  headers: GmailMessageResponse['payload'] extends { headers?: infer T } ? T : never,
  name: string
) {
  return headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeMerchantName(value: string | null) {
  if (!value) {
    return null;
  }

  return compactWhitespace(
    value
      .toLowerCase()
      .replace(/["']/g, '')
      .replace(/\b(receipt|billing|support|help|notifications|team|invoice|renewal|subscription)\b/g, '')
      .replace(/[<>()[\],]/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function titleCaseMerchant(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseSenderName(from: string | null) {
  if (!from) {
    return null;
  }

  const namedMatch = from.match(/"?([^"<]+)"?\s*</);

  if (namedMatch?.[1]) {
    return compactWhitespace(namedMatch[1]);
  }

  const emailMatch = from.match(/<?([^<>\s]+@[^<>\s]+)>?/);

  if (!emailMatch?.[1]) {
    return null;
  }

  const localPart = emailMatch[1].split('@')[0] ?? '';
  const firstPart = localPart.split(/[._+-]/).find(Boolean) ?? localPart;

  if (!firstPart) {
    return null;
  }

  return titleCaseMerchant(firstPart);
}

function extractMerchantFromSubject(subject: string | null) {
  if (!subject) {
    return null;
  }

  const patterns = [
    /(?:your|for|from)\s+([A-Z][A-Za-z0-9&+' -]{1,40})/i,
    /^([A-Z][A-Za-z0-9&+' -]{1,40})\s+(?:receipt|invoice|renewal|subscription|billing|charge)/i,
    /(?:receipt|invoice|renewal|subscription|billing|charge)\s+(?:for|from)\s+([A-Z][A-Za-z0-9&+' -]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = subject.match(pattern);

    if (match?.[1]) {
      return compactWhitespace(match[1]);
    }
  }

  return null;
}

function deriveMerchantName(subject: string | null, from: string | null) {
  const subjectMerchant = extractMerchantFromSubject(subject);

  if (subjectMerchant) {
    return subjectMerchant;
  }

  const senderName = parseSenderName(from);

  if (!senderName) {
    return 'Unknown subscription';
  }

  const normalizedSender = normalizeMerchantName(senderName);

  if (normalizedSender && !genericSenderNames.has(normalizedSender)) {
    return senderName;
  }

  return 'Unknown subscription';
}

function extractAmount(text: string) {
  const symbolMatch = text.match(/([$€£])\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/);

  if (symbolMatch?.[1] && symbolMatch[2]) {
    return {
      amount: Number(symbolMatch[2].replace(/,/g, '')),
      currencyCode: currencySymbolMap[symbolMatch[1]] ?? null,
    };
  }

  const codeMatch = text.match(/\b(USD|EUR|GBP|CAD|AUD)\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/i);

  if (codeMatch?.[1] && codeMatch[2]) {
    return {
      amount: Number(codeMatch[2].replace(/,/g, '')),
      currencyCode: codeMatch[1].toUpperCase(),
    };
  }

  return {
    amount: null,
    currencyCode: null,
  };
}

function extractBillingCycle(text: string): BillingCycle | null {
  const normalized = text.toLowerCase();

  if (normalized.includes('quarterly') || normalized.includes('every 3 months')) {
    return 'quarterly';
  }

  if (
    normalized.includes('yearly') ||
    normalized.includes('annual') ||
    normalized.includes('annually') ||
    normalized.includes('every year')
  ) {
    return 'yearly';
  }

  if (normalized.includes('weekly') || normalized.includes('every week')) {
    return 'weekly';
  }

  if (
    normalized.includes('monthly') ||
    normalized.includes('per month') ||
    normalized.includes('every month')
  ) {
    return 'monthly';
  }

  return null;
}

function normalizeDate(parsedDate: Date) {
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().slice(0, 10);
}

function extractRenewalDate(text: string) {
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

  if (isoMatch?.[1]) {
    return isoMatch[1];
  }

  const monthNameMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i
  );

  if (monthNameMatch) {
    const [, month, day, explicitYear] = monthNameMatch;
    const now = new Date();
    const year = explicitYear ? Number(explicitYear) : now.getUTCFullYear();
    const parsedDate = new Date(`${month} ${day} ${year} 12:00:00 UTC`);

    if (!explicitYear && parsedDate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      parsedDate.setUTCFullYear(parsedDate.getUTCFullYear() + 1);
    }

    return normalizeDate(parsedDate);
  }

  return null;
}

function isLikelySubscriptionEmail(subject: string | null, from: string | null, snippet: string | null) {
  const combined = `${subject ?? ''} ${from ?? ''} ${snippet ?? ''}`.toLowerCase();

  return subscriptionKeywords.some((keyword) => combined.includes(keyword));
}

function buildCandidateFromMessage(
  connection: ImportConnectionRecord,
  message: GmailMessageResponse
): ImportCandidateInsert | null {
  const subject = getHeaderValue(message.payload?.headers, 'Subject');
  const from = getHeaderValue(message.payload?.headers, 'From');
  const snippet = message.snippet ? compactWhitespace(message.snippet) : null;

  if (!isLikelySubscriptionEmail(subject, from, snippet)) {
    return null;
  }

  const text = [subject, from, snippet].filter((part): part is string => Boolean(part)).join(' ');
  const { amount, currencyCode } = extractAmount(text);
  const billingCycle = extractBillingCycle(text);
  const renewalDate = extractRenewalDate(text);
  const merchantName = deriveMerchantName(subject, from);

  return {
    user_id: connection.user_id,
    connection_id: connection.id,
    source_message_id: message.id,
    merchant_name: merchantName,
    normalized_name: normalizeMerchantName(merchantName),
    amount,
    currency_code: currencyCode,
    billing_cycle: billingCycle,
    renewal_date: renewalDate,
    raw_subject: subject,
    raw_from: from,
    raw_snippet: snippet,
    detected_at: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
  };
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T;

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null &&
      'message' in payload.error &&
      typeof payload.error.message === 'string'
        ? payload.error.message
        : 'Request failed.';

    throw new Error(message);
  }

  return payload;
}

export async function refreshGoogleAccessToken(connection: ImportConnectionRecord) {
  if (!connection.refresh_token) {
    throw new Error('Missing Gmail refresh token. Reconnect Gmail to continue syncing.');
  }

  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');

  const response = await fetch(googleTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const payload = (await response.json()) as GmailTokenResponse;

  if (!response.ok || !payload.access_token) {
    const message = payload.error_description ?? payload.error ?? 'Could not refresh Gmail access token.';
    throw new Error(message);
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? connection.refresh_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
  };
}

export async function getValidGoogleAccessToken(connection: ImportConnectionRecord) {
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  const hasUsableAccessToken =
    connection.access_token && expiresAt > Date.now() + 60 * 1000;

  if (hasUsableAccessToken) {
    return {
      accessToken: connection.access_token as string,
      refreshToken: connection.refresh_token,
      expiresAt: connection.token_expires_at as string,
      refreshed: false,
    };
  }

  const refreshedToken = await refreshGoogleAccessToken(connection);

  return {
    accessToken: refreshedToken.accessToken,
    refreshToken: refreshedToken.refreshToken,
    expiresAt: refreshedToken.expiresAt,
    refreshed: true,
  };
}

async function listCandidateMessageIds(accessToken: string) {
  const ids = new Set<string>();

  await Promise.all(
    gmailSearchQueries.map(async (query) => {
      const url = new URL(`${gmailApiBaseUrl}/messages`);
      url.searchParams.set('maxResults', '15');
      url.searchParams.set('q', query);

      const payload = await fetchJson<GmailMessageListResponse>(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      for (const message of payload.messages ?? []) {
        ids.add(message.id);
      }
    })
  );

  return [...ids];
}

async function fetchMessage(accessToken: string, messageId: string) {
  const url = new URL(`${gmailApiBaseUrl}/messages/${messageId}`);
  url.searchParams.set('format', 'metadata');
  url.searchParams.set('metadataHeaders', 'Subject');
  url.searchParams.set('metadataHeaders', 'From');

  return fetchJson<GmailMessageResponse>(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function buildImportCandidatesForConnection(connection: ImportConnectionRecord) {
  const token = await getValidGoogleAccessToken(connection);
  const messageIds = await listCandidateMessageIds(token.accessToken);
  const messages = await Promise.all(messageIds.map((messageId) => fetchMessage(token.accessToken, messageId)));
  const candidates = messages
    .map((message) => buildCandidateFromMessage(connection, message))
    .filter((candidate): candidate is ImportCandidateInsert => candidate !== null);

  return {
    candidates,
    token,
    scannedCount: messages.length,
  };
}
