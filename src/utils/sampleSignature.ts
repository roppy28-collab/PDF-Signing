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

/**
 * Generates a realistic sample JPG of handwritten initials ("J.D.")
 * for users needing a quick initial stamp or second signature style.
 */
export function createSampleInitialsJpg(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Draw paper background
  ctx.fillStyle = '#f9f9f7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(1, 'rgba(235, 235, 225, 0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#1e3a8a'; // royal blue ink
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw "J."
  ctx.beginPath();
  ctx.moveTo(90, 70);
  ctx.lineTo(160, 65);
  ctx.moveTo(130, 68);
  ctx.bezierCurveTo(135, 120, 130, 180, 110, 195);
  ctx.bezierCurveTo(90, 205, 65, 185, 80, 160);
  ctx.stroke();

  // Dot after J
  ctx.beginPath();
  ctx.arc(155, 185, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();

  // Draw "D."
  ctx.beginPath();
  ctx.moveTo(195, 75);
  ctx.lineTo(190, 190);
  ctx.moveTo(190, 75);
  ctx.bezierCurveTo(240, 65, 295, 95, 290, 135);
  ctx.bezierCurveTo(285, 175, 230, 195, 185, 190);
  ctx.stroke();

  // Dot after D
  ctx.beginPath();
  ctx.arc(315, 185, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();

  // Underline flourish
  ctx.beginPath();
  ctx.lineWidth = 2.8;
  ctx.moveTo(80, 215);
  ctx.bezierCurveTo(160, 225, 260, 215, 330, 205);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.92);
}

