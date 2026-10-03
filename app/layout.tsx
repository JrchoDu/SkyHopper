import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sky Hopper — Take the long way up',
  description: 'A tiny bird, a big sky. How far can you fly?',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
