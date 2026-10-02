export type ScheduledEconomicEvent = {
  id: string;
  name: string;
  releaseAt: string;
};

export const ECONOMIC_SCHEDULE_2026: ScheduledEconomicEvent[] = [
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-07-02T08:30:00-04:00' },
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-08-07T08:30:00-04:00' },
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-09-04T08:30:00-04:00' },
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-10-02T08:30:00-04:00' },
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-11-06T08:30:00-05:00' },
  { id: 'US_NFP', name: 'US Nonfarm Payrolls', releaseAt: '2026-12-04T08:30:00-05:00' },

  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-07-14T08:30:00-04:00' },
  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-08-12T08:30:00-04:00' },
  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-09-11T08:30:00-04:00' },
  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-10-14T08:30:00-04:00' },
  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-11-10T08:30:00-05:00' },
  { id: 'US_CPI', name: 'US CPI / Inflation', releaseAt: '2026-12-10T08:30:00-05:00' },

  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-07-15T08:30:00-04:00' },
  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-08-13T08:30:00-04:00' },
  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-09-10T08:30:00-04:00' },
  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-10-15T08:30:00-04:00' },
  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-11-13T08:30:00-05:00' },
  { id: 'US_PPI', name: 'US PPI', releaseAt: '2026-12-15T08:30:00-05:00' },

  { id: 'US_FOMC', name: 'FOMC', releaseAt: '2026-07-29T14:00:00-04:00' },
  { id: 'US_FOMC', name: 'FOMC', releaseAt: '2026-09-16T14:00:00-04:00' },
  { id: 'US_FOMC', name: 'FOMC', releaseAt: '2026-10-28T14:00:00-04:00' },
  { id: 'US_FOMC', name: 'FOMC', releaseAt: '2026-12-09T14:00:00-05:00' },

  { id: 'US_RATE', name: 'Fed Rate Decision', releaseAt: '2026-07-29T14:00:00-04:00' },
  { id: 'US_RATE', name: 'Fed Rate Decision', releaseAt: '2026-09-16T14:00:00-04:00' },
  { id: 'US_RATE', name: 'Fed Rate Decision', releaseAt: '2026-10-28T14:00:00-04:00' },
  { id: 'US_RATE', name: 'Fed Rate Decision', releaseAt: '2026-12-09T14:00:00-05:00' },

  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-07-30T08:30:00-04:00' },
  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-08-26T08:30:00-04:00' },
  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-09-30T08:30:00-04:00' },
  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-10-29T08:30:00-04:00' },
  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-11-25T08:30:00-05:00' },
  { id: 'US_GDP', name: 'US GDP', releaseAt: '2026-12-23T08:30:00-05:00' },

  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-07-30T08:30:00-04:00' },
  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-08-28T08:30:00-04:00' },
  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-09-30T08:30:00-04:00' },
  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-10-29T08:30:00-04:00' },
  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-11-25T08:30:00-05:00' },
  { id: 'US_PCE', name: 'US PCE', releaseAt: '2026-12-23T08:30:00-05:00' },
  
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-07-16T08:30:00-04:00' },
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-08-14T08:30:00-04:00' },
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-09-16T08:30:00-04:00' },
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-10-15T08:30:00-04:00' },
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-11-17T08:30:00-05:00' },
  { id: 'US_RETAIL_SALES', name: 'US Retail Sales', releaseAt: '2026-12-16T08:30:00-05:00' },
];

export function nearestScheduledEvent(id: string, referenceAt: string, windowDays = 45): ScheduledEconomicEvent | undefined {
  const reference = Date.parse(referenceAt);
  if (!Number.isFinite(reference)) return undefined;

  return ECONOMIC_SCHEDULE_2026
    .filter((event) => event.id === id)
    .map((event) => ({ event, distance: Math.abs(Date.parse(event.releaseAt) - reference) }))
    .filter(({ distance }) => distance <= windowDays * 86400000)
    .sort((a, b) => a.distance - b.distance)[0]?.event;
}
