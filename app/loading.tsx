export default function Loading() {
  return (
    <div className="flex min-h-[80svh] items-center justify-center" role="status" aria-label="Loading">
      <span className="block h-px w-[200px] overflow-hidden bg-line"><span className="cue block h-px w-1/3 bg-lavender-deep" /></span>
    </div>
  );
}
