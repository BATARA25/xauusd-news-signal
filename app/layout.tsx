import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'XAUUSD News Signal', description: 'Real-time macro news intelligence for XAUUSD' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
