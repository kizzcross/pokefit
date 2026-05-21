import axios from 'axios';

function flattenFieldErrors(data: Record<string, unknown>): string | null {
  for (const value of Object.values(data)) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'string' && first.trim()) {
        return first;
      }
    }
  }
  return null;
}

/** Mensagem amigável a partir de erro Axios / DRF. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error) || !error.response?.data) {
    return fallback;
  }

  const data = error.response.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (typeof data !== 'object' || data === null) {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string' && record.detail.trim()) {
    return record.detail;
  }

  const fieldMessage = flattenFieldErrors(record);
  if (fieldMessage) {
    return fieldMessage;
  }

  return fallback;
}
