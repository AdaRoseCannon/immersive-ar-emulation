# Immersive AR Emulation for THREE.js

This project is still pretty new and will have lots of issues, it has not been widely tested, pull requests and contributions are very welcome.

![ezgif-1-c9a7ac33a76d](https://user-images.githubusercontent.com/4225330/100097900-1e470200-2e55-11eb-88d8-8e1544880780.gif)

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

## Usage A-Frame

Demo: [A-Frame Demo for this Emulator](https://adarosecannon.github.io/immersive-ar-emulation/demo/a-frame/index.html)

Add the `EmulateAR.aframe.js` **BEFORE** the AFrame the script.

```html
<script src="../../build/EmulateAR.aframe.js"></script>
<script src="https://cdn.jsdelivr.net/gh/aframevr/aframe@6e3b6c84391d50b45a1a3e801b74ca9d03ac8c09/dist/aframe-master.min.js"></script>
```

Then set up AR in A-Frame as usual.

## Usage THREE.JS

Unfortunately it does require some integrating into your code, for an example app checkout the `demo/` folder of this repo.

### Step 1

Import the code as shown above.

### Step 2 - Get the environment GLB

You can find the URL of the scene in `.glb` format to download in `sceneModelURL`,

Download the model using the [ThreeJS GLTF Loader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader).

### Step 3 - Initialise the emulator

Use this model and your scene and renderer to setup the emulator.

```js
const environment = (await loadModel(sceneModelURL)).scene;
initEmulateAR({ renderer, environment });
```

You can then either apply the immersive-ar proxy to modify to `navigator.xr`

```js
applyImmersiveARProxy();
```

but if you prefer to leave it unmodified you can use `immersiveARProxyRequired` to see if you need to add a button
which can call `requestSession` and `isSessionSupported` from the emulator yourself.


### Step 4 - Add the render hook

It must go before the your render function. It ignores depth and turns off autoclear so it needs to first so
that it clears the buffer and renders underneath the rest of your scene.

```js
renderer.setAnimationLoop(function (timestamp, frame) {
	renderEnvironment(camera);
	renderer.render(scene, camera);
});
```
