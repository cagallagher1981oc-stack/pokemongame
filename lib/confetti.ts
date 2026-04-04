import confetti from 'canvas-confetti';

export function fireCorrectConfetti() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
  });
}

export function fireMilestoneConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FF6B6B', '#A855F7'],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFD700', '#FF6B6B', '#A855F7'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
