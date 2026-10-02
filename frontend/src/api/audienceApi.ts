import type { AudiencePreviewRequest, AudiencePreviewResponse } from '../types/audience';

const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export class AudienceApiError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AudienceApiError';
  }
}

export async function previewAudience(
  request: AudiencePreviewRequest
): Promise<AudiencePreviewResponse> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/v1/audiences/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new AudienceApiError(
      'Unable to reach the backend. Check that the server is running.',
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    const message = body?.error?.message ?? `Request failed with status ${response.status}`;
    const code = body?.error?.code ?? 'REQUEST_ERROR';
    throw new AudienceApiError(message, code);
  }

  return response.json() as Promise<AudiencePreviewResponse>;
}
