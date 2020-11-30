/* global AFRAME, THREE */

import {
	init as initEmulateAR,
	// eslint-disable-next-line no-unused-vars
	requestSession,
	// eslint-disable-next-line no-unused-vars
	isSessionSupported,
	renderEnvironment,
	applyImmersiveARProxy,
	sceneModelURL,
} from "./EmulateAR.js";

applyImmersiveARProxy();

window.addEventListener('DOMContentLoaded', function () {

	const loader = new THREE.GLTFLoader();
	function loadModel(url) {
		
		return new Promise((resolve, reject) => {
			loader.load(
				url,
				function (gltf) {
					resolve(gltf);
				},
				// eslint-disable-next-line no-unused-vars
				function ( xhr ) {},
				function ( error ) {
					reject(error);
				}
			);
		})
	}
	
	AFRAME.registerSystem("my-component", {
		schema: {}, 
	
		init: function () {
			const renderer = this.el.renderer;
			const scene = this.el.object3D;
			const environment = new THREE.Object3D();
	
			loadModel(sceneModelURL)
				.then(({ scene }) => environment.add(scene));
			initEmulateAR({ scene, renderer, environment });
		},
		tick() {
			renderEnvironment(this.el.camera);	
		}
	});
	
});