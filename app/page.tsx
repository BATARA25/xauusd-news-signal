// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';

type Signal = { symbol: 'XAUUSD'; bias: 'BUY' | 'SELL' | 'WAIT'; confidence: number; evidenceScore: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; phase?: 'PRE_RELEASE' | 'POST_RELEASE' | 'CONTEXT'; eventName?: string; eventReleaseAt?: string; updatedAt: string; drivers: string[]; highImpactCount: number; sampleSize: number };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };

const PUSH_WORKER_URL = 'https://newsxleak-push-worker-production.up.railway.app';
const VAPID_PUBLIC_KEY = 'BMIMkJMz2bK8vLx0pXimADNcTfsrwdsPzDX1zzl70Hgo67s7Sef4tNoo4AChkYle90IYil4DuzhjdcpiL_RSUMI';


