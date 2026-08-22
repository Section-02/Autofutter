import { mapUsdaSearchResponse } from './usdaMapper';
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
}>;

export class UsdaClient {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchFunction;

  constructor(options: UsdaClientOptions = {}) {
    this.apiKey =
      options.apiKey?.trim() ||
      process.env.EXPO_PUBLIC_USDA_API_KEY?.trim() ||
      'DEMO_KEY';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(
    query: string,
    dataType: readonly string[],
    pageSize: number,
  ): Promise<UsdaFoodCandidate[]> {
    try {
      const response = await this.fetchImpl(
        `${USDA_SEARCH_URL}?api_key=${encodeURIComponent(this.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, dataType, pageSize }),
        },
      );
      if (!response.ok) {
        throw new UsdaSearchError(
          response.status === 429
            ? 'USDA search limit reached. Please try again later.'
            : 'USDA search is temporarily unavailable.',
        );
      }
      const body: unknown = await response.json();
      return mapUsdaSearchResponse(body);
    } catch (error) {
      if (error instanceof UsdaSearchError) throw error;
      throw new UsdaSearchError('USDA search requires an internet connection.');
    }
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
}
