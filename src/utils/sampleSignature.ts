/**
 * Generates a realistic sample JPG signature with a paper background
 * so users can test immediately without needing a local JPG on hand.
 */
export function createSampleSignatureJpg(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw light off-white paper background (typical of paper/scanned document)
  ctx.fillStyle = '#f8f8f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle paper grain/gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(0.5, 'rgba(240, 240, 235, 0.2)');
  grad.addColorStop(1, 'rgba(230, 230, 220, 0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw an elegant handwritten signature stroke
  ctx.strokeStyle = '#1a264a'; // classic dark ink
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // First initial (J)
  ctx.moveTo(80, 160);
  ctx.bezierCurveTo(90, 80, 130, 60, 150, 75);
  ctx.bezierCurveTo(165, 90, 150, 180, 130, 200);
  ctx.bezierCurveTo(115, 215, 95, 195, 110, 175);
  ctx.bezierCurveTo(140, 140, 180, 150, 200, 145);

  // Middle loops (ohn / handwriting flourish)
  ctx.bezierCurveTo(220, 120, 240, 170, 255, 140);
  ctx.bezierCurveTo(265, 115, 275, 165, 290, 135);
  ctx.bezierCurveTo(305, 105, 320, 170, 340, 130);

  // Surname initial (D)
  ctx.moveTo(355, 180);
  ctx.bezierCurveTo(365, 80, 375, 60, 385, 70);
  ctx.bezierCurveTo(430, 60, 480, 90, 470, 140);
  ctx.bezierCurveTo(460, 185, 400, 190, 360, 185);

  // Tail underline flourish
  ctx.moveTo(320, 175);
  ctx.bezierCurveTo(380, 195, 490, 175, 540, 160);
  ctx.stroke();

  // Subtle cross line
  ctx.beginPath();
  ctx.lineWidth = 2.4;
  ctx.moveTo(170, 110);
  ctx.lineTo(210, 105);
  ctx.stroke();

  // Export as JPEG (no alpha channel, proving our translucent background remover works!)
  return canvas.toDataURL('image/jpeg', 0.92);
}
