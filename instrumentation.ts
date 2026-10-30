export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { archiveExpiredStories } = await import("./src/lib/story-archive");
  let running = false;
  const archive = async () => {
    if (running) return;
    running = true;
    try {
      await archiveExpiredStories();
    } catch (error) {
      console.error("Failed to archive expired stories.", error);
    } finally {
      running = false;
    }
  };
  void archive();
  const timer = setInterval(() => { void archive(); }, 60_000);
  timer.unref();
}
