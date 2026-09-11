export class ProviderError extends Error {
  constructor(public provider: string, message: string, options?: ErrorOptions) {
    super(`${provider}: ${message}`, options); this.name = 'ProviderError';
  }
}
export interface RemoteDocument { text: string; url: string; lastModified?: string }
export async function fetchDocument(url: string, provider: string): Promise<RemoteDocument> {
  let failure: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'TFT-Assistant-V0.1 (public-static-data)' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
      const text = await response.text();
      if (!text.trim()) throw new Error(`Empty response ${url}`);
      return { text, url: response.url, lastModified: response.headers.get('last-modified') ?? undefined };
    } catch (error) { failure = error; }
  }
  throw new ProviderError(provider, `下载失败 ${url}: ${failure instanceof Error ? failure.message : String(failure)}`, { cause: failure });
}
export function parseJson<T>(doc: RemoteDocument, provider: string): T {
  try { return JSON.parse(doc.text) as T; }
  catch (cause) { throw new ProviderError(provider, `不是有效 JSON: ${doc.url}`, { cause }); }
}
