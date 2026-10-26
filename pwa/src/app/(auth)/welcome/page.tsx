import { connection } from 'next/server';
import { resolveAppIdentity } from '@/lib/server/app-identity';
import { resolveWelcomeDemoPrefill } from '@/lib/server/welcome-demo';
import { WelcomeForm } from './WelcomeForm';

export default async function WelcomePage() {
  await connection();
  const identity = resolveAppIdentity();
  return <WelcomeForm initialPassphrase={resolveWelcomeDemoPrefill(identity)} />;
}
