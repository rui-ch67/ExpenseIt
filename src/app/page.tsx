// Temporary holding page while v2 is built. Replaced by the real home in Phase 3.
export default function Home() {
  return (
    <main className="mx-auto max-w-prose p-6">
      <h1 className="text-2xl font-semibold">ExpenseIt</h1>
      <p className="mt-2">
        Version 2 is being rebuilt for the web. The original Android app is preserved at the{" "}
        <a
          className="underline"
          href="https://github.com/rui-ch67/ExpenseIt/tree/v1-android-fyp"
        >
          v1-android-fyp
        </a>{" "}
        tag.
      </p>
    </main>
  );
}
