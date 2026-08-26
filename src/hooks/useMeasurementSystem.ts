import { useEffect, useMemo, useState } from 'react';

import type { MeasurementSystem } from '@/domain/measurements/measurementSystem';
import { MeasurementPreferenceService } from '@/services/settings/measurementPreferenceService';
import { useAppDatabase } from './useAppDatabase';

export function useMeasurementSystem(): MeasurementSystem {
  const database = useAppDatabase();
  const service = useMemo(() => new MeasurementPreferenceService(database), [database]);
  const [system, setSystem] = useState<MeasurementSystem>('grams');

  useEffect(() => {
    let active = true;
    service.load().then((value) => active && setSystem(value));
    return () => { active = false; };
  }, [service]);

  return system;
}
