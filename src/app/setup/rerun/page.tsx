import { SetupWizard } from '../SetupWizard';

export const metadata = {
  title: 'Setup Wizard — Prism',
};

export default function RerunSetupPage() {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return <SetupWizard appUrl={appUrl} />;
}
