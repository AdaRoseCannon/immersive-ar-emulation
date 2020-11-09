import {
	PerspectiveCamera,
	SpotLight,
	WebGLRenderer,
	AmbientLight,
	Scene,
} from "/node_modules/three/build/three.module.js";

import {
	DRACOLoader
} from "./node_modules/three/examples/jsm/loaders/DRACOLoader.js"
import {
	GLTFLoader
} from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js"
import {
	OrbitControls
} from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import {
	ARButton
} from "./node_modules/three/examples/jsm/webxr/ARButton.js";

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '/node_modules/three/examples/js/libs/draco/' );
loader.setDRACOLoader(dracoLoader);

const { camera, scene, renderer } = init();
animate({ camera, scene, renderer });

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
 
function init() {
 
    const camera = new PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
    camera.position.z = 1;
	camera.position.y = 1;
	camera.lookAt(0, 0, 0);
 
    const scene = new Scene();
 
	loadModel('/assets/doggy.glb')
		.then(gltf => {
			const dog = gltf.scene;
			dog.rotation.y = Math.PI*0.9;
			scene.add(dog)
		});
 
    const renderer = new WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild(renderer.domElement);

	window.overlay.appendChild(ARButton.createButton(renderer, {
		optionalFeatures: ["dom-overlay"],
		domOverlay: {
			root: window.overlay
		}
	}));
	
	new OrbitControls( camera, renderer.domElement );

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
 
	return { camera, scene, renderer };
}
 
function animate(options) {
	const { camera, scene, renderer } = options;

    requestAnimationFrame( () => animate(options) );
    renderer.render( scene, camera );
 
}