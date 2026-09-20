/**
 * Gmail API Client for reading email attachments and sending signed PDFs.
 */

export interface SendEmailOptions {
  to: string;
  from?: string;
  subject: string;
  bodyText: string;
  attachmentName: string;
  attachmentBytes: Uint8Array;
}

export interface GmailAttachmentItem {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  filename: string;
  attachmentId: string;
  size: number;
}

/**
 * Encodes a Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encodes a string or base64 to base64url
 */
function toBase64Url(base64Str: string): string {
  return base64Str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Builds an RFC 2822 MIME message string with a PDF attachment
 */
function createMimeMessage(options: SendEmailOptions): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const cleanFilename = options.attachmentName.replace(/["\r\n]/g, '');
  const attachmentBase64 = uint8ArrayToBase64(options.attachmentBytes);

  // Split base64 into 76-character lines according to MIME specifications
  const wrappedBase64 = attachmentBase64.match(/.{1,76}/g)?.join('\r\n') || attachmentBase64;

  const lines = [
    `To: ${options.to}`,
    options.from ? `From: ${options.from}` : '',
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(options.subject)))}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    options.bodyText || 'Please find the signed PDF document attached.',
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${cleanFilename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${cleanFilename}"`,
    '',
    wrappedBase64,
    '',
    `--${boundary}--`,
  ];

  return lines.filter((l) => l !== '').join('\r\n');
}

/**
 * Sends an email with the signed PDF attachment directly via Gmail API.
 */
export async function sendEmailViaGmail(
  token: string,
  options: SendEmailOptions
): Promise<{ id: string; threadId: string }> {
  const mime = createMimeMessage(options);
  const raw = toBase64Url(btoa(unescape(encodeURIComponent(mime))));

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || `Gmail send failed with HTTP status ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Creates a draft in Gmail with the signed PDF attachment.
 */
export async function createGmailDraft(
  token: string,
  options: SendEmailOptions
): Promise<{ id: string }> {
  const mime = createMimeMessage(options);
  const raw = toBase64Url(btoa(unescape(encodeURIComponent(mime))));

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || `Creating Gmail draft failed with status ${res.status}`;
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Lists recent emails in the user's inbox that contain PDF attachments.
 */
export async function listGmailPdfAttachments(
  token: string,
  maxResults: number = 10
): Promise<GmailAttachmentItem[]> {
  const query = encodeURIComponent('has:attachment filename:pdf');
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch messages: ${listRes.status}`);
  }

  const listData = await listRes.json();
  const messages = listData.messages || [];
  if (messages.length === 0) {
    return [];
  }

  const results: GmailAttachmentItem[] = [];

  // Fetch metadata and attachment parts for each message in parallel
  await Promise.all(
    messages.map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!detailRes.ok) return;

        const detail = await detailRes.json();
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No subject)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

        // Traverse parts to find PDF attachments
        const findPdfParts = (parts: any[] = []) => {
          for (const part of parts) {
            const filename = part.filename || '';
            const isPdf =
              filename.toLowerCase().endsWith('.pdf') ||
              part.mimeType?.toLowerCase() === 'application/pdf';

            if (isPdf && part.body?.attachmentId) {
              results.push({
                messageId: msg.id,
                threadId: msg.threadId,
                subject,
                from,
                date,
                filename: filename || 'document.pdf',
                attachmentId: part.body.attachmentId,
                size: part.body.size || 0,
              });
            }

            if (part.parts && part.parts.length > 0) {
              findPdfParts(part.parts);
            }
          }
        };

        findPdfParts(detail.payload?.parts || []);
      } catch (err) {
        console.warn('Failed to parse message detail:', err);
      }
    })
  );

  return results;
}

/**
 * Downloads a specific attachment from Gmail and returns Uint8Array bytes.
 */
export async function downloadGmailAttachment(
  token: string,
  messageId: string,
  attachmentId: string
): Promise<Uint8Array> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to download attachment: ${res.status}`);
  }

  const data = await res.json();
  const base64Url = data.data;
  if (!base64Url) {
    throw new Error('No data found in attachment response');
  }

  // Convert base64url to standard base64
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}
