/**
 * Utilities for sharing and composing signed PDF emails in Outlook (Web & Desktop).
 */

export interface OutlookComposeOptions {
  to: string;
  subject: string;
  body: string;
  pdfBytes?: Uint8Array;
  filename?: string;
}

/**
 * Generates an Outlook.com (personal / Live / Hotmail) compose web URL
 */
export function getOutlookLiveComposeUrl(options: {
  to: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({
    to: options.to,
    subject: options.subject,
    body: options.body,
  });
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates an Office 365 / Microsoft 365 (work & school) compose web URL
 */
export function getOutlookOfficeComposeUrl(options: {
  to: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({
    to: options.to,
    subject: options.subject,
    body: options.body,
  });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/**
 * Generates a system mailto link (opens Outlook Desktop or default client)
 */
export function getMailtoLink(options: {
  to: string;
  subject: string;
  body: string;
}): string {
  const query = new URLSearchParams();
  if (options.subject) query.set('subject', options.subject);
  if (options.body) query.set('body', options.body);
  const qs = query.toString();
  return `mailto:${encodeURIComponent(options.to)}${qs ? `?${qs}` : ''}`;
}

/**
 * Prepares and downloads the signed PDF for Outlook attachment
 */
export function downloadPdfForOutlook(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
