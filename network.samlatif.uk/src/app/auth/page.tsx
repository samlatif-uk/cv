import { AuthFlow } from "@/components/AuthFlow";

export default function AuthPage() {
  const googleEnabled = Boolean(
    (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
    (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET),
  );
  const linkedInEnabled = Boolean(
    (process.env.AUTH_LINKEDIN_ID || process.env.LINKEDIN_CLIENT_ID) &&
    (process.env.AUTH_LINKEDIN_SECRET || process.env.LINKEDIN_CLIENT_SECRET),
  );

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-8">
      <section>
        <div className="cv-kicker text-xs font-semibold uppercase tracking-[0.2em]">
          Account
        </div>
      </section>
      <AuthFlow
        googleEnabled={googleEnabled}
        linkedInEnabled={linkedInEnabled}
      />
    </main>
  );
}
