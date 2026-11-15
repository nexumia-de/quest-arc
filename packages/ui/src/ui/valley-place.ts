/**
 * What a place in the Valley gains around its thing (#114 decision 5,
 * #131; docs/journey-design.md, "Signs and surroundings of a place"):
 * plants while a step there is still followed, the lit lantern when it
 * runs by itself (the plants stay), and the surroundings in fixed steps
 * (fence, tree, bench, gate) from a further journey's finished stations.
 * The pictures are drawn once in the frame of content/art/place.json (the
 * build's units over its slot, for a thing on the right of the path) and
 * fit every thing; a thing on the left gets the frame mirrored, so the
 * surroundings always lie on the far side, away from the path.
 *
 * Pure: it only places pictures from the engine's `valley` view and the
 * place piece's slot (`valleyLayout`). Layers, back to front: ground,
 * path and bay, `back` (surroundings, then plants), the thing, the marker,
 * `front` (the lantern), the name. Nothing is shown before it is earned.
 * No imports, so scripts/draw-valley.mjs loads it as it is.
 */
/** content/art/place.json. */
export interface PlaceArt {
  /** The frame in build units: [x, y, width, height]. */
  readonly viewBox: readonly [number, number, number, number];
  /** The side of the frame away from the path. */
  readonly far: 'left' | 'right';
  readonly plants: string;
  /** The lit lantern: a picture placed in the frame's units. */
  readonly lantern: {
    readonly art: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** One picture per step, in order; each whole, drawn over the ones before. */
  readonly surroundings: readonly { readonly art: string; readonly title: string }[];
}

/** The slot of a place piece: the build's box in scene units. */
export interface PlaceSlot {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

/** What the view says of a place (`valley` in the engine's view). */
export interface PlaceSigns {
  readonly side: 'left' | 'right';
  readonly sign?: 'plants' | 'lantern';
  readonly surroundings: number;
}

/** A picture in scene units; `viewBox` is its own, `mirror` flips it within its box. */
export interface PlaceLayer {
  readonly art: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly viewBox: string;
  readonly mirror: boolean;
}

export interface PlaceLayers {
  /** Behind the thing: the surroundings' steps in order, then the plants. */
  readonly back: readonly PlaceLayer[];
  /** In front of the thing and its marker: the lit lantern. */
  readonly front: readonly PlaceLayer[];
}

/** The layers of one place over its slot. */
export const placeLayers = (art: PlaceArt, slot: PlaceSlot, place: PlaceSigns): PlaceLayers => {
  const [fx, fy, fw, fh] = art.viewBox;
  const mirror = place.side !== art.far;
  const frame = (name: string): PlaceLayer => ({
    art: name,
    x: slot.x + fx * slot.scale,
    y: slot.y + fy * slot.scale,
    width: fw * slot.scale,
    height: fh * slot.scale,
    viewBox: art.viewBox.join(' '),
    mirror,
  });
  const steps = Math.max(0, Math.min(place.surroundings, art.surroundings.length));
  const back = art.surroundings.slice(0, steps).map((step) => frame(step.art));
  // the plants stay when the lantern is lit: graduation follows the time
  // the routine was still followed
  if (place.sign !== undefined) back.push(frame(art.plants));
  const front: PlaceLayer[] = [];
  if (place.sign === 'lantern') {
    const { art: name, x, y, width, height } = art.lantern;
    // mirrored, the lantern keeps its own form and moves to the other side
    const left = mirror ? 2 * fx + fw - x - width : x;
    front.push({
      art: name,
      x: slot.x + left * slot.scale,
      y: slot.y + y * slot.scale,
      width: width * slot.scale,
      height: height * slot.scale,
      viewBox: '0 0 32 32',
      mirror: false,
    });
  }
  return { back, front };
};
