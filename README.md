# falling-leaves 🍂

**[Live demo](https://ernkerr.github.io/falling-leaves/)**

Falling autumn leaves for any website. Small (~8 KB minified), no dependencies, drawn on a canvas, with an optional React component.

- Maple leaves by default, plus oak, ginkgo, birch and oval shapes, or your own leaf images
- Leaves sway, spin and tumble as they fall
- Change options while it runs, with no restart
- Doesn't animate for people whose system asks for reduced motion
- Sharp on high-DPI screens, and clicks pass straight through

## Install

```sh
npm install falling-leaves
```

## Vanilla JS

```js
import { FallingLeaves } from 'falling-leaves';

// Covers the whole page
const leaves = new FallingLeaves();

// Or only inside one element
const hero = new FallingLeaves({ container: document.querySelector('.hero') });
```

| Method | What it does |
| --- | --- |
| `start()` | Starts or resumes the animation |
| `stop()` | Pauses it |
| `update(options)` | Changes options while it runs |
| `destroy()` | Stops it and removes the canvas |

## React

```jsx
import { FallingLeaves } from 'falling-leaves/react';

// Covers the whole page
<FallingLeaves fullScreen />

// Fills its parent. The parent needs position: relative.
<div style={{ position: 'relative', height: 400 }}>
  <FallingLeaves count={50} wind={[0.5, 2]} />
</div>

// Every option is a prop. Changing a prop updates the leaves without restarting.
<FallingLeaves fullScreen shapes={['ginkgo']} speed={[1, 2]} wind={[-1, 1]} />
```

It's safe to use with server rendering: nothing runs until the component mounts in the browser. In the Next.js App Router, use it inside a `'use client'` component.

## Options

Range options take either one number or a `[min, max]` pair, and each leaf picks its own value from the range.

| Option | Default | Description |
| --- | --- | --- |
| `count` | `30` | How many leaves are on screen |
| `size` | `[14, 30]` | Leaf size in pixels |
| `speed` | `[0.6, 1.5]` | Fall speed in pixels per frame (at 60fps) |
| `wind` | `[-0.3, 0.8]` | Sideways drift. Negative blows left |
| `sway` | `[0.4, 1.4]` | How far leaves swing side to side |
| `rotationSpeed` | `[-1.5, 1.5]` | Spin in degrees per frame |
| `colors` | autumn palette | Leaf colors (any CSS color). By default ginkgo leaves are gold |
| `shapes` | `['maple']` | Which built-in shapes to use: `'maple'`, `'oak'`, `'ginkgo'`, `'birch'`, `'oval'` |
| `images` | — | Your own leaf images (`HTMLImageElement`, canvas, etc.). Replaces `colors` and `shapes` |
| `opacity` | `1` | Leaf opacity |
| `zIndex` | `9999` full page, `0` in a container | Canvas z-index |
| `respectReducedMotion` | `true` | Don't animate when the user's system asks for reduced motion |
| `autoStart` | `true` | Start animating straight away |
| `container` | page | Element to fill. Vanilla JS only |
| `fullScreen` | `false` | Cover the whole page. React only |

### Your own images

```js
const maple = new Image();
maple.src = '/maple.png';

new FallingLeaves({ images: [maple], size: [20, 40] });
```

## Development

```sh
npm install
npm test          # unit tests
npm run build     # builds dist/
npm run demo      # builds and serves the demo at http://localhost:3000/demo/
```

## License

MIT
