// Each finger owns its input, so steering and acceleration can be held together.
export function createTouchInput(heldKeys, onChange = () => {}) {
  const pointers = new Map();
  function sync() {
    heldKeys.clear();
    for (const key of pointers.values()) heldKeys.add(key);
    onChange(heldKeys);
  }
  return {
    press(id, key) {
      pointers.set(id, key);
      sync();
    },
    release(id) {
      pointers.delete(id);
      sync();
    },
    clear() {
      pointers.clear();
      sync();
    },
  };
}
export function bindTouchControls(buttons, heldKeys, canDrive) {
  const input = createTouchInput(heldKeys, (keys) => {
    for (const button of buttons) {
      const active = keys.has(button.dataset.key);
      button.classList.toggle("pressed", active);
      button.setAttribute("aria-pressed", String(active));
    }
  });
  for (const button of buttons) {
    const start = (e) => {
      e.preventDefault();
      if (!canDrive()) return;
      input.press(e.pointerId, button.dataset.key);
      button.setPointerCapture(e.pointerId);
    };
    const end = (e) => input.release(e.pointerId);
    if ("PointerEvent" in window) {
      button.addEventListener("pointerdown", start, { passive: false });
      button.addEventListener("pointermove", (e) => e.preventDefault(), {
        passive: false,
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(type, end);
    } else {
      button.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (canDrive())
            for (const touch of e.changedTouches)
              input.press(touch.identifier, button.dataset.key);
        },
        { passive: false },
      );
      button.addEventListener("touchmove", (e) => e.preventDefault(), {
        passive: false,
      });
      for (const type of ["touchend", "touchcancel"])
        button.addEventListener(
          type,
          (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches)
              input.release(touch.identifier);
          },
          { passive: false },
        );
    }
    for (const type of ["contextmenu", "selectstart", "dragstart"])
      button.addEventListener(type, (e) => e.preventDefault());
    button.addEventListener("keydown", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      if (canDrive())
        input.press(`keyboard-${button.dataset.key}`, button.dataset.key);
    });
    button.addEventListener("keyup", (e) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      input.release(`keyboard-${button.dataset.key}`);
    });
    button.addEventListener("blur", () =>
      input.release(`keyboard-${button.dataset.key}`),
    );
  }
  return input.clear;
}
