import {
  UsdaClient,
  UsdaSearchError,
} from '../../src/services/usda/usdaClient';

function response(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('UsdaClient', () => {
  it('uses one combined request and keeps generic results ahead of branded results', async () => {
    const requests: string[][] = [];
    const client = new UsdaClient({
      apiKey: 'test-key',
      fetchImpl: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { dataType: string[] };
        requests.push(body.dataType);
        return response({
          foods: [
            {
              fdcId: 2,
              description: 'Brand Chicken',
              dataType: 'Branded',
              foodNutrients: [],
            },
            {
              fdcId: 1,
              description: 'Chicken, roasted',
              dataType: 'Foundation',
              foodNutrients: [],
            },
          ],
        });
      },
    });

    const results = await client.search('chicken');

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual([
      'Foundation',
      'SR Legacy',
      'Survey (FNDDS)',
      'Branded',
    ]);
    expect(results.map(({ fdcId }) => fdcId)).toEqual(['1', '2']);
  });

  it('uses the required offline message when the request cannot connect', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const client = new UsdaClient({
      apiKey: 'test-key',
      fetchImpl,
      retryDelaysMs: [0, 0],
      sleepImpl: async () => undefined,
    });

    await expect(client.search('rice')).rejects.toEqual(
      new UsdaSearchError('USDA search requires an internet connection.'),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries a temporary USDA failure before showing an error', async () => {
    const sleepImpl = jest.fn(async () => undefined);
    const fetchImpl = jest
      .fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(response({}, false, 503))
      .mockResolvedValueOnce(response({ foods: [] }));
    const client = new UsdaClient({
      apiKey: 'test-key',
      fetchImpl,
      retryDelaysMs: [350, 900],
      sleepImpl,
    });

    await expect(client.search('rice')).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledWith(350);
  });

  it('reports the USDA rate limit without treating it as an offline failure', async () => {
    const fetchImpl = jest.fn(async () => response({}, false, 429));
    const client = new UsdaClient({
      apiKey: 'test-key',
      fetchImpl,
    });

    await expect(client.search('rice')).rejects.toThrow(
      'USDA search limit reached. Please try again later.',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
