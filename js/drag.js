// Pointer input on the board: drag a flag to another slot, or tap a slot.
// Works the same for mouse, pen, and touch through Pointer Events.
//
//   pointerdown on a slot ─► pointermove past DRAG_THRESHOLD ─► drag (ghost follows)
//                       └──► pointerup without moving ─────────► onTap(slot)
//   pointerup while dragging ─► onDrop(from, nearest slot under the ghost)
//
// Only one pointer at a time: a second finger is ignored until the first one lifts.

const DRAG_THRESHOLD     = 8;
const TOUCH_GHOST_OFFSET = -60; // lift the ghost above the finger so the player can see it

export function setupBoardInput({ slotEls, ghost, canDrag, onPickUp, onHover, onDrop, onTap, onCancel }) {
  let pointerId = null;
  let fromSlot = null;
  let dragging = false;
  let startX = 0, startY = 0;
  let offsetY = 0;
  let lastX = 0, tilt = 0;
  let slotRects = null;

  // Slot positions stay fixed during a gesture. Refresh only if the page moves.
  const invalidateRects = () => { slotRects = null; };
  window.addEventListener('resize', invalidateRects);
  window.addEventListener('scroll', event => {
    // Scrolling the separate atlas strip does not move the board.
    if (event.target === document || event.target === window || event.target.contains?.(slotEls[0])) invalidateRects();
  }, true);

  function reset() {
    pointerId = null;
    fromSlot = null;
    dragging = false;
    tilt = 0;
    slotRects = null;
  }

  slotEls.forEach((el, i) => {
    el.addEventListener('pointerdown', e => {
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      fromSlot = i;
      dragging = false;
      startX = lastX = e.clientX;
      startY = e.clientY;
      offsetY = e.pointerType === 'touch' ? TOUCH_GHOST_OFFSET : 0;
    });
  });

  document.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < DRAG_THRESHOLD) return;
      if (!canDrag(fromSlot)) return;
      dragging = true;
      slotRects = slotEls.map(el => el.getBoundingClientRect());
      onPickUp(fromSlot);
    }
    // Read geometry before writing the ghost transform, never after each move.
    if (!slotRects) slotRects = slotEls.map(el => el.getBoundingClientRect());
    tilt = tilt * 0.7 + Math.max(-18, Math.min(18, (e.clientX - lastX) * 0.9)) * 0.3;
    lastX = e.clientX;
    const x = e.clientX, y = e.clientY + offsetY;
    ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${tilt}deg) scale(1.12)`;
    onHover(fromSlot, nearestSlot(x, y));
  });

  document.addEventListener('pointerup', e => {
    if (e.pointerId !== pointerId) return;
    const from = fromSlot;
    const wasDragging = dragging;
    const to = wasDragging ? nearestSlot(e.clientX, e.clientY + offsetY) : null;
    reset();
    if (wasDragging) onDrop(from, to);
    else onTap(from);
  });

  document.addEventListener('pointercancel', e => {
    if (e.pointerId !== pointerId) return;
    const wasDragging = dragging;
    reset();
    if (wasDragging) onCancel();
  });

  // The slot whose center is nearest to (x, y), if the point is reasonably close to it.
  function nearestSlot(x, y) {
    let best = null, bestDist = Infinity;
    if (!slotRects) slotRects = slotEls.map(el => el.getBoundingClientRect());
    slotRects.forEach((r, i) => {
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < r.width * 0.68 && d < bestDist) { best = i; bestDist = d; }
    });
    return best;
  }
}
