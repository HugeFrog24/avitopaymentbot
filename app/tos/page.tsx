import { getActiveTos } from "@/lib/services/tosService"

export const metadata = { title: "Terms of Service" }

export default async function TosPage() {
  const tos = await getActiveTos()

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Terms of Service
      </h1>
      {tos ? (
        <>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-8">Version {tos.version}</p>
          <article className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {tos.content}
          </article>
        </>
      ) : (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Terms of service are not yet available.
        </p>
      )}
    </main>
  )
}
