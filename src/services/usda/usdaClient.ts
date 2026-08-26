import { mapUsdaFood, mapUsdaSearchResponse } from './usdaMapper';
import type { UsdaFoodCandidate } from './usdaTypes';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const SEARCH_TYPES = [
  'Foundation',
  'SR Legacy',
  'Survey (FNDDS)',
  'Branded',
] as const;

export class UsdaSearchError extends Error {}

type FetchFunction = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type UsdaClientOptions = Readonly<{
  apiKey?: string;
  fetchImpl?: FetchFunction;
  retryDelaysMs?: readonly number[];
  sleepImpl?: (milliseconds: number) => Promise<void>;
}>;

const DEFAULT_RETRY_DELAYS_MS = [350, 900] as const;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status >= 500;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class UsdaClient {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchFunction;
  private readonly retryDelaysMs: readonly number[];
  private readonly sleepImpl: (milliseconds: number) => Promise<void>;

  constructor(options: UsdaClientOptions = {}) {
    this.apiKey =
      options.apiKey?.trim() ||
      process.env.EXPO_PUBLIC_USDA_API_KEY?.trim() ||
      'DEMO_KEY';
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.sleepImpl = options.sleepImpl ?? sleep;
  }

  private async fetchJson(input: string, init?: RequestInit): Promise<unknown> {
    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(input, init);
      } catch {
        if (attempt < this.retryDelaysMs.length) {
          await this.sleepImpl(this.retryDelaysMs[attempt]!);
          continue;
        }
        throw new UsdaSearchError('USDA search requires an internet connection.');
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new UsdaSearchError('USDA search limit reached. Please try again later.');
        }
        if (isRetryableStatus(response.status) && attempt < this.retryDelaysMs.length) {
          await this.sleepImpl(this.retryDelaysMs[attempt]!);
          continue;
        }
        throw new UsdaSearchError('USDA search is temporarily unavailable.');
      }

      try {
        return await response.json();
      } catch {
        if (attempt < this.retryDelaysMs.length) {
          await this.sleepImpl(this.retryDelaysMs[attempt]!);
          continue;
        }
        throw new UsdaSearchError('USDA search is temporarily unavailable.');
      }
    }

    throw new UsdaSearchError('USDA search is temporarily unavailable.');
  }

  private async request(
    query: string,
    dataType: readonly string[],
    pageSize: number,
  ): Promise<UsdaFoodCandidate[]> {
    const body = await this.fetchJson(
      `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, dataType, pageSize }),
      },
    );
    return mapUsdaSearchResponse(body);
  }

  async search(query: string): Promise<UsdaFoodCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const results = await this.request(trimmed, SEARCH_TYPES, 25);
    const generic = results.filter(({ dataType }) => dataType !== 'Branded');
    const branded = results.filter(({ dataType }) => dataType === 'Branded');
    const seen = new Set<string>();
    return [...generic, ...branded].filter(({ fdcId }) => {
      if (seen.has(fdcId)) return false;
      seen.add(fdcId);
      return true;
    });
  }

  async details(fdcId: string): Promise<UsdaFoodCandidate> {
    const body = await this.fetchJson(
      `https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(fdcId)}?format=full&api_key=${encodeURIComponent(this.apiKey)}`,
    );
    const food = mapUsdaFood(body);
    if (food === null) {
      throw new UsdaSearchError('USDA food details are temporarily unavailable.');
    }
    return food;
  }
}
