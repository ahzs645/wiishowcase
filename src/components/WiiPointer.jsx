import { memo, forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import '../../Wii.css/js/wii-pointer.js';

const TEMPLATE_BASE = `${import.meta.env.BASE_URL}assets/pointers/templates/`;

function validPlayer(player) {
  return window.WiiPointer.PLAYERS[player] ? player : 'P1';
}

// React wrapper around the Wii.css pointer system (window.WiiPointer from
// Wii.css/js/wii-pointer.js). The Pointer instance owns its own DOM element
// appended to <body>, so this component renders nothing itself.
//
// `followMouse` also enables the built-in trail, mousedown scale effect, and
// global cursor hiding — use it for the local pointer only. Remote pointers
// are driven through the x/y props (or ref.setPosition) instead.
const WiiPointer = forwardRef(function WiiPointer(
  { x = 0, y = 0, player = 'P1', visible = true, followMouse = false, trail = false },
  ref,
) {
  const pointerRef = useRef(null);
  // Latest props, so the async init can apply them once the templates load.
  const stateRef = useRef({ x, y, player, visible, followMouse });
  stateRef.current = { x, y, player, visible, followMouse };

  useEffect(() => {
    let cancelled = false;
    let instance = null;

    window.WiiPointer.create({
      player: validPlayer(stateRef.current.player),
      state: 'Pointer',
      size: 64,
      basePath: TEMPLATE_BASE,
      followMouse: false,
      zIndex: 10000,
      trail,
    }).then((pointer) => {
      if (cancelled) {
        pointer.destroy();
        return;
      }
      instance = pointer;
      pointerRef.current = pointer;
      const { x: px, y: py, visible: pVisible, followMouse: pFollow } = stateRef.current;
      pointer.moveTo(px, py);
      if (pVisible) {
        pointer.show();
        if (pFollow) pointer.followMouse(true);
      } else {
        pointer.hide();
      }
    });

    return () => {
      cancelled = true;
      if (instance) {
        instance.followMouse(false);
        instance.destroy();
      }
      pointerRef.current = null;
    };
    // Trail can only be configured at creation time.
  }, [trail]);

  useImperativeHandle(ref, () => ({
    setPosition(nextX, nextY) {
      pointerRef.current?.moveTo(nextX, nextY);
    },
  }), []);

  useEffect(() => {
    pointerRef.current?.moveTo(x, y);
  }, [x, y]);

  useEffect(() => {
    pointerRef.current?.setPlayer(validPlayer(player));
  }, [player]);

  useEffect(() => {
    const pointer = pointerRef.current;
    if (!pointer) return;
    if (visible) {
      pointer.show();
      if (followMouse) pointer.followMouse(true);
    } else {
      if (followMouse) pointer.followMouse(false);
      pointer.hide();
    }
  }, [visible, followMouse]);

  return null;
});

export default memo(WiiPointer);
