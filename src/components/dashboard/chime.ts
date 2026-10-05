/**
 * A short two-note chime made with the Web Audio API, so there's no sound
 * file to load. Browsers only allow audio after a click, which is what the
 * "Start shift" button is for (docs/DECISIONS.md B7).
 */
let context: AudioContext | null = null;

export async function unlockAudio(): Promise<boolean> {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

export function playChime(): void {
  if (!context || context.state !== "running") return;
  const start = context.currentTime;
  for (const [offset, frequency] of [
    [0, 880],
    [0.18, 1318.5],
  ] as const) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.5);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.55);
  }
}
