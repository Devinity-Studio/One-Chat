import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OneChat',
  description: 'Omnichannel chat and operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
