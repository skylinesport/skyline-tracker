import './globals.css';

export const metadata = {
  title: 'Skyline Launch Tracker',
  description: 'What is done and what is left to ship Skylinesport.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
