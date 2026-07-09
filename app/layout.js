import './globals.css';

export const metadata = {
  title: 'Lapse',
  description: 'Daily shared timelapse streak tracker',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
