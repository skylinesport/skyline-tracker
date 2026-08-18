import './globals.css';
import Lock from './Lock';

export const metadata = {
  title: 'Skyline Launch Tracker',
  description: 'What is done and what is left to ship Skylinesport.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Lock>{children}</Lock>
      </body>
    </html>
  );
}
