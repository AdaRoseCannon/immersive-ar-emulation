import {
	PerspectiveCamera,
	SpotLight,
	WebGLRenderer,
	AmbientLight,
	Scene,
	Vector3,
	MeshBasicMaterial,
	PlaneGeometry,
	Mesh,
	Color
} from "./node_modules/three/build/three.module.js?";

import {
	DRACOLoader
} from "./node_modules/three/examples/jsm/loaders/DRACOLoader.js?";
import {
	GLTFLoader
} from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js?";
import {
	OrbitControls
} from "./node_modules/three/examples/jsm/controls/OrbitControls.js?";
import {
	ARButton
} from "./node_modules/three/examples/jsm/webxr/ARButton.js?";

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '/node_modules/three/examples/js/libs/draco/' );
loader.setDRACOLoader(dracoLoader);

function loadModel(url) {
	
	return new Promise((resolve, reject) => {
		loader.load(
			url,
			function (gltf) {
				resolve(gltf);
			},
			function ( xhr ) {
				console.log( ( xhr.loaded / xhr.total * 100 ) + `% loaded [${url}]` );
			},
			function ( error ) {
				reject(error);
			}
		);
	})
}

class HitTest {
	constructor(renderer) {
		this.renderer = renderer;
		this.xrHitTestSource = null;

		renderer.xr.addEventListener("sessionend", () => {
			this.xrHitTestSource = null;
		});

		renderer.xr.addEventListener("sessionstart", async () => {
			this.session = renderer.xr.getSession();
			
			const viewerSpace = await this.session.requestReferenceSpace('viewer');
			const hitTestSource = await this.session.requestHitTestSource({
				space: viewerSpace,
			});
			this.xrHitTestSource = hitTestSource;
		});
	}

	doHit(frame) {
		if (!this.renderer.xr.isPresenting) return;
		const refSpace = this.renderer.xr.getReferenceSpace();
		const xrViewerPose = frame.getViewerPose(refSpace);

		if (this.xrHitTestSource && xrViewerPose) {
			const hitTestResults = frame.getHitTestResults(this.xrHitTestSource);
			if (hitTestResults.length > 0) {
				const pose = hitTestResults[0].getPose(refSpace);
				return pose;
			} else {
				return false;
			}
		}
	}
}

(function init() {
 
	const target = new Vector3(0, 0, -1);
	const camera = new PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
	camera.position.y = 1.6;
	camera.lookAt(0, 0, -1);
 
	const scene = new Scene();
	const renderer = new WebGLRenderer({ antialias: true });
	const controller = renderer.xr.getController(0);
	
	renderer.xr.enabled = true;
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	window.overlay.appendChild(ARButton.createButton(renderer, {
		optionalFeatures: ["dom-overlay", "hit-test", "local-floor"],
		domOverlay: {
			root: window.overlay
		},

	}));
	
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.target = target;
	controls.update();

	const ambientLight = new AmbientLight(0x404040); // soft white light
	ambientLight.name = "ambientLight";
	ambientLight.intensity = 4;
	scene.add(ambientLight);

	// FRONTLIGHT
	const frontLight = new SpotLight(0xffffff);
	frontLight.name = "frontLight";
	frontLight.position.set(0, 15, 25);
	frontLight.target.position.set(0, 0, 0);
	frontLight.intensity = 0.2;

	const reticle = new Mesh(
		new PlaneGeometry(0.5, 0.5, 1, 1).rotateX(-Math.PI/2),
		new MeshBasicMaterial({ color: new Color('blue') })
	);
	reticle.position.copy(target);
	scene.add(reticle);

	const hitTest = new HitTest(renderer, reticle);
 
	renderer.setAnimationLoop(function (timestamp, frame) {
		const pose = hitTest.doHit(frame);
		if (pose) {
			reticle.position.copy(pose.transform.position);
			reticle.quaternion.copy(pose.transform.orientation);
		}
		renderer.render(scene, camera);
	});
	
	window.addEventListener( 'resize', onWindowResize, false );
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	}

	loadModel('./assets/doggy.glb')
		.then(gltf => {
			const dog = gltf.scene;
			dog.position.copy(target);
			dog.children[2].rotation.y = Math.PI * 0.9;
			scene.add(dog);

			controller.addEventListener('select', function () {
				dog.position.copy(reticle.position);
				dog.quaternion.copy(reticle.quaternion);
			});
		});
})();
