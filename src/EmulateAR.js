import {
	DRACOLoader
} from "three/examples/jsm/loaders/DRACOLoader";

import {
	GLTFLoader
} from "three/examples/jsm/loaders/GLTFLoader";

import {
	Raycaster,
	Vector3,
	Quaternion
} from "three";

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( './node_modules/three/examples/js/libs/draco/' );
loader.setDRACOLoader(dracoLoader);

function loadModel(url) {
	
	return new Promise((resolve, reject) => {
		loader.load(
			url,
			function ( gltf ) {
				resolve( gltf );
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

let environmentModel;
async function environment(url = './assets/room.glb') {

	if (environmentModel) return environmentModel;
	environmentModel = await loadModel(url)
		.then(gltf => gltf.scene);
	
	environmentModel.traverse(o => {
		if (o.geometry && o.material) {
			o.geometry.computeFaceNormals();
		}
	});
	
	return environmentModel;
} 

async function requestHitTestSource(options) {
	const session = this;
	return new HitTestSource(session, options);
}

async function requestHitTestSourceForTransientInput(options) {
	const session = this;
	return new TransientHitTestSource(session, options);
}

class HitTestSource {
	constructor(session, {
		space,
		offsetRay
	}) {
		this.__space = space;
		this.__offsetRay = offsetRay;
		this.__session = session;
	}

	cancel() {

	}
}

const quaternion = new Quaternion();
function normalToOrientation(normal, direction) {

	// Find out what the angle should be from the direction vector
	quaternion.setFromAxisAngle(normal, 0);
	return quaternion.clone();
}

class XRHitTestResult {
	constructor(frame, position, orientation) {
		this.__transform = new window.XRRigidTransform(position, orientation);
		this.__frame = frame;
	}

	getPose(refSpace) {
		// return new EmulatedXRPose(this.__transform);
		const offsetReferenceSpace = referenceSpace.getOffsetReferenceSpace(this.__transform);
		const pose = this.__frame.getPose(offsetReferenceSpace, refSpace);
		return pose;
	}
}

class TransientHitTestSource {
	constructor(session, {
		space,
		offsetRay
	}) {
		space;
		offsetRay;

		// Do nothing this is not supported for headsets
	}

	cancel() {
		
	}
}
	
function getHitTestResultsForTransientInput() {
	return [];
}

let referenceSpace;
function setReferenceSpace(refSpace) {
	referenceSpace = refSpace;
}

const direction = new Vector3();
const raycaster = new Raycaster();
function getHitTestResults(hitTestSource) {

	if (!environmentModel) return [];

	const frame = this;
	const space = hitTestSource.__offsetRay ? hitTestSource.__space.getOffsetReferenceSpace(hitTestSource.__offsetRay) : hitTestSource.__space;

	const pose = frame.getPose(space, referenceSpace);
	direction.set(0, 0, -1);
	direction.applyQuaternion(pose.transform.orientation)
	raycaster.set(pose.transform.position, direction);
	return raycaster.intersectObject(environmentModel, true)
		.map(result => new XRHitTestResult(
			frame,
			result.point,
			normalToOrientation(result.face.normal, direction)
		))
}

export default async function init({ scene, renderer }) {
	
	if (!navigator.xr) return;

	// if AR is already supported we don't need to do anything
	if (await navigator.xr.isSessionSupported('immersive-ar')) return;

	// if immersive-vr isn't supported then we can't do anything
	if (! await navigator.xr.isSessionSupported('immersive-vr')) return;

	
	renderer.xr.addEventListener('sessionstart', async function () {

		setReferenceSpace(renderer.xr.getReferenceSpace());
		scene.add(await environment());

	});

	const requestSessionOld = navigator.xr.requestSession.bind(navigator.xr);
	async function requestSession(type, sessionInit) {
		console.log('Proxied requestSession');
	
		const featuresToPolyfill = [];
		sessionInit.optionalFeatures = sessionInit.optionalFeatures.filter(function (name) {
			switch (name) {
				case 'hit-test':
				case 'lighting-estimation':
					featuresToPolyfill.push(name);
					return false;
				default:
					return true;
			}
		});
	
		if (type === 'immersive-ar') {
			type = 'immersive-vr';
		}

		const session = await requestSessionOld(type, sessionInit);

		Object.defineProperty(session, 'requestHitTestSource', {
			value: requestHitTestSource,
			configurable: true
		});

		Object.defineProperty(session, 'requestHitTestSourceForTransientInput', {
			value: requestHitTestSourceForTransientInput,
			configurable: true
		});

		return session;
	}
	navigator.xr.requestSession = requestSession.bind(navigator.xr);

	Object.defineProperty(window.XRFrame.prototype, 'getHitTestResultsForTransientInput', {
		configurable: true,
		value: getHitTestResultsForTransientInput
	});

	Object.defineProperty(window.XRFrame.prototype, 'getHitTestResults', {
		configurable: true,
		value: getHitTestResults
	});
	
	const isSessionSupportedOld = navigator.xr.isSessionSupported.bind(navigator.xr);
	function isSessionSupported(type) {
		console.log('Proxied isSessionSupported');
	
		if (type === 'immersive-ar') {
			return isSessionSupportedOld('immersive-vr');
		}
		return isSessionSupportedOld(type);
	}
	navigator.xr.isSessionSupported = isSessionSupported.bind(navigator.xr);
	
}