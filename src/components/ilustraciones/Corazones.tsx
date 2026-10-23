/**
 * Corazoncitos que suben y se desvanecen: la "celebración" cuando la persona
 * mayor hace algo lindo (contar su ánimo, responder una pregunta). Se
 * posicionan sobre el contenedor padre, que debe ser `relative`.
 */
const CORAZONES = [
  { izq: "14%", color: "#DA6A61", tam: 18, retraso: "0s" },
  { izq: "32%", color: "#E2883A", tam: 14, retraso: "0.25s" },
  { izq: "50%", color: "#C1483F", tam: 22, retraso: "0.1s" },
  { izq: "68%", color: "#B29FC9", tam: 15, retraso: "0.4s" },
  { izq: "84%", color: "#E8B23D", tam: 17, retraso: "0.2s" },
];

export default function CorazonesSubiendo() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2 h-16 overflow-visible">
      {CORAZONES.map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute animate-heart-up"
          style={{ left: c.izq, width: c.tam, height: c.tam, animationDelay: c.retraso }}
        >
          <path fill={c.color} d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" />
        </svg>
      ))}
    </div>
  );
}
