# Immersive AR Emulation for THREE.js

WebXR gives you the ability to build Augmented Reality experiences in the Web, both for handsets like phones and headsets. It's very possible to build
a single code-path which works well for headsets and handsets without needing to detect which kind of hardware you are using.

Unforunately AR headsets are expensive and hard to access to so many AR experiences only work with handsets either through design or accident.

The other type of head mounted WebXR experience is immersive Virtual Reality. Virtual Reality headsets are cheaper and more widely avaialble
than VR headsets so what if you could test Headset Augmented Reality on a VR Headset?

> "What if you could test Headset AR on a VR Headset?"

**NB:** This is not designed for use in production code, this method of modifying the XRFrame is inefficient, and will give you poor performance. This is only for testing the AR path of your WebXR app.
If you want to provide users a VR fallback for your XR experience you should have a seperate code path which uses THREE.js' Raycaster when the user is in a VR session.

This is a project designed to allow you to test your `immersive-ar` session in a VR headset it acts kind of
like a polyfill, if `immersive-ar` is already supported then it does nothing. But if `immersive-vr` is supported
and `immersive-ar` it will let it work by:

* In emulated `immersive-ar` draw a background scene behind your scene
* Modifying `navigator.xr.isSessionSupported` to override requests for immersive-ar to let it be allowed.
* Modifying `navigator.xr.requestSession` to return an `immersive-vr` session if an `immersive-ar` session is requested which has been modified such that:
  * It supports `requestHitTestSource` by testing against the rendered background scene
  * It modifies `requestAnimationFrame` so that each XRFrame returned has a replacement `getHitTestResults`

## Installation

There are two methods of installation one, for if you have THREE.JS as a script and one for if you are building with Webpack or Rollup

### ThreeJS as a script

```html
<script src="js/three.js"></script>
<script type="module">
import {
	init as initEmulateAR,
	requestSession,
	isSessionSupported,
	renderEnvironment,
	applyImmersiveARProxy,
	sceneModelURL
} from "https://adarosecannon.github.io/immersive-ar-emulation/src/EmulateAR.js";
</script>

```

### With WebPack or Rollup

```bash
npm install --save immersive-ar-emulation
```

```js
import {
	init as initEmulateAR,
	requestSession,
	isSessionSupported,
	renderEnvironment,
	applyImmersiveARProxy,
	sceneModelURL
} from "immersive-ar-emulation";
```

## Usage

Unfortunately it does require some integrating into your code, for an example app checkout the `demo/` folder of this repo.

### Step 1

Import the code as shown above.

You can find the URL of the scene in `.glb` format to download in `sceneModelURL`,

Download the model using the [ThreeJS GLTF Loader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader).

Use this model and your scene and renderer to setup the emulator.

```js
const environment = (await loadModel(sceneModelURL)).scene;
initEmulateAR({ scene, renderer, environment });
```

You can then either apply the immersive-ar proxy to modify to `navigator.xr`

```js
await applyImmersiveARProxy();
```

but if you prefer to leave it unmodified you can use `immersiveARProxyRequired` to see if you need to add a button
which can call `requestSession` and `isSessionSupported` from the emulator yourself.
