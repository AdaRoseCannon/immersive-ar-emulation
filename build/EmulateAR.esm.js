import {
	Quaternion,
	Vector3,
	Matrix4,
	Raycaster
} from 'three';

// eslint-disable-next-line no-unused-vars
const THREE = {
	Quaternion,
	Vector3,
	Matrix4,
	Raycaster
}
/* global THREE */

const isSessionSupportedOld = navigator.xr.isSessionSupported.bind(navigator.xr);
const requestSessionOld = navigator.xr.requestSession.bind(navigator.xr);
const sceneModelURL = 'https://ada.is/immersive-ar-emulation/assets/room.glb';
let inSession = false;
let environmentModel;
let referenceSpace;
let renderFunc = function () { };

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
		this.__space = null;
		this.__offsetRay = null;
		this.__session = null;
		this.__canceled = true;
	}
}

// eslint-disable-next-line no-unused-vars
class EmulatedXRPose {
	constructor(transform) {
		this.transform = transform;
	}
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

function setReferenceSpace(refSpace) {
	referenceSpace = refSpace;
}

function onSessionEnded() {
	inSession = false;
}
function onSessionStart() {
	inSession = true;
}

function renderEnvironment(camera) {
	renderFunc(camera);
}

async function immersiveARProxyRequired() {
	// If there is no WebXR support then do nothing, probably on http
	if (!navigator.xr) return false;

	// if AR is already supported we don't need to do anything
	if (await navigator.xr.isSessionSupported('immersive-ar')) return false;

	// if immersive-vr isn't supported then we can't do anything
	if (! await navigator.xr.isSessionSupported('immersive-vr')) return false;

	return true;
}

async function applyImmersiveARProxy() {
	navigator.xr.requestSession = requestSession.bind(navigator.xr);
	navigator.xr.isSessionSupported = isSessionSupported.bind(navigator.xr);
}
	
function isSessionSupported(type) {
	console.log('Proxied isSessionSupported');

	if (type === 'immersive-ar') {
		return isSessionSupportedOld('immersive-vr');
	}
	return isSessionSupportedOld(type);
}

let getHitTestResults = function () { };

function polyfillHitTest(session) {

	Object.defineProperty(session, 'requestHitTestSource', {
		value: requestHitTestSource,
		configurable: true
	});

	Object.defineProperty(session, 'requestHitTestSourceForTransientInput', {
		value: requestHitTestSourceForTransientInput,
		configurable: true
	});

	const requestAnimationFrameOld = session.requestAnimationFrame.bind(session);
	Object.defineProperty(session, 'requestAnimationFrame', {
		value: function (animationFrameCallback) {
			requestAnimationFrameOld(function (time, xrFrame) {

				Object.defineProperty(xrFrame, 'getHitTestResultsForTransientInput', {
					value: getHitTestResultsForTransientInput.bind(xrFrame),
					configurable: true
				});
		
				Object.defineProperty(xrFrame, 'getHitTestResults', {
					value: getHitTestResults.bind(xrFrame),
					configurable: true
				});

				animationFrameCallback(time, xrFrame);
			})
		},
		configurable: true
	});

}

async function requestSession(type, sessionInit) {
	console.log('Proxied requestSession');

	if (type != 'immersive-ar') {
		return requestSessionOld(type, sessionInit);
	}
	
	type = 'immersive-vr';

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

	const session = await requestSessionOld(type, sessionInit);

	onSessionStart();
	session.addEventListener( 'end', onSessionEnded );

	if (featuresToPolyfill.includes('hit-test')) {
		polyfillHitTest(session);
	}

	if (featuresToPolyfill.includes('lighting-estimation')) {
		console.log('lighting-estimation is not supported by the immersive-ar emulator');
	}

	return session;
}

function init({ renderer, scene, environment }) {

	const bgscene = scene.clone(false);
	renderFunc = function renderEnvironment(camera) {
		renderer.clear();
	
		if (!inSession) return;
		renderer.render(bgscene, camera);
		renderer.clearDepth();
	}

	renderer.autoClear = false;
	
	renderer.xr.addEventListener('sessionstart', function () {

		setReferenceSpace(renderer.xr.getReferenceSpace());

	});
	
	// Ensure normal vectors are available
	environment.traverse(o => {
		if (o.geometry && o.material) {
			o.geometry.computeFaceNormals();
		}
	});

	bgscene.add(environment);

	environmentModel = environment;

	const tempQuaternion = new THREE.Quaternion();
	const tempQuaternion2 = new THREE.Quaternion();
	const tempVec = new THREE.Vector3();
	const directionProjectedOntoPlane = new THREE.Vector3();
	function normalToOrientation(normal, direction) {
		normal.normalize();
		direction.normalize();
	
		tempVec.set(0, 1, 0);
	
		// Find out what the angle should be from the direction vector
		tempQuaternion.setFromUnitVectors(tempVec, normal);
	
		const normalSquared = normal.lengthSq();
		const vectorDotNormal = direction.dot(normal);
	
		// get the direction projected onto the plane
		directionProjectedOntoPlane.copy(normal).multiplyScalar(-1 * vectorDotNormal / normalSquared).add(direction);
	
		// Get the -z unit vector in the plane
		tempVec.set(0, 0, -1);
		tempVec.applyQuaternion(tempQuaternion);
	
		// calculate the angle between them
		tempQuaternion2.setFromUnitVectors(tempVec, directionProjectedOntoPlane);
	
		tempQuaternion.premultiply(tempQuaternion2);
	
		return tempQuaternion.clone();
	}

	const direction = new THREE.Vector3();
	const raycaster = new THREE.Raycaster();
	getHitTestResults = function getHitTestResults(hitTestSource) {
	
		if (!environmentModel) return [];
	
		const frame = this;
		const space = hitTestSource.__offsetRay ? hitTestSource.__space.getOffsetReferenceSpace(hitTestSource.__offsetRay) : hitTestSource.__space;
	
		const pose = frame.getPose(space, referenceSpace);
	
		if (pose === null) return [];
	
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
}

export {
	init,
	sceneModelURL,
	requestSession, // async
	renderEnvironment,
	isSessionSupported, // async
	applyImmersiveARProxy, //async
	immersiveARProxyRequired, //async
}