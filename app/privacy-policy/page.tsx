import { getActivePrivacyPolicy } from "@/lib/services/privacyPolicyService"

export const metadata = { title: "Privacy Policy" }

export default async function PrivacyPolicyPage() {
  const policy = await getActivePrivacyPolicy()

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Privacy Policy
      </h1>
      {policy ? (
        <>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-8">Version {policy.version}</p>
          <article className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {policy.content}
          </article>
        </>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Privacy policy is not yet available.
        </p>
      )}
    </main>
  )
}
