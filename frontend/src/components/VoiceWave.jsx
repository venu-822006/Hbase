export default function VoiceWave({ active = true, count = 7, color = "var(--green)" }) {
  const heights = [10, 16, 22, 14, 20, 12, 18, 24, 15];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3.5px",
        height: "24px",
        padding: "0 4px",
      }}
      title="Live Stream / Voice Waveform"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: "3px",
            backgroundColor: color,
            borderRadius: "3px",
            height: active ? `${heights[i % heights.length]}px` : "4px",
            animation: active
              ? `voiceWave ${0.5 + (i % 5) * 0.15}s ease-in-out infinite alternate`
              : "none",
            animationDelay: `${i * 0.08}s`,
            transition: "height 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
