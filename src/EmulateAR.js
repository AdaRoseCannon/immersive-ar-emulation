import {
	Quaternion,
	Vector3,
	Matrix4,
	Raycaster
} from 'three';

const THREE = {
	Quaternion,
	Vector3,
	Matrix4,
	Raycaster
}

const isSessionSupportedOld = navigator.xr.isSessionSupported.bind(navigator.xr);
const requestSessionOld = navigator.xr.requestSession.bind(navigator.xr);
const direction = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const sceneModelURL = 'http://ada.is/immersive-ar-emulation/assets/room.glb';
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

const tempQuaternion = new THREE.Quaternion();
const tempMatrix = new THREE.Matrix4();
const originVec = new THREE.Vector3();
const tempVec = new THREE.Vector3();
const tempMatrix2 = new THREE.Matrix4();
function normalToOrientation(normal, direction) {
	tempMatrix.identity();
	tempVec.crossVectors(normal, direction).normalize();
	tempMatrix.lookAt(tempVec, originVec, normal);

	// The model ends up looking perpendicular to the viewer so rotate by 90deg counter clockwise about the normal
	tempMatrix2.makeRotationAxis(normal, Math.PI / 2);
	tempMatrix.multiply(tempMatrix2);

	// Find out what the angle should be from the direction vector
	tempQuaternion.setFromRotationMatrix(tempMatrix);
	tempQuaternion.rot
	return tempQuaternion.clone();
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

function getHitTestResults(hitTestSource) {

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
	if (! await immersiveARProxyRequired()) return console.log('AR Proxy not applied,because either immersive-ar is already supported or immersive-vr is not supported.');

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
	} else {
		return;
	}

	const session = await requestSessionOld(type, sessionInit);

	onSessionStart();
	session.addEventListener( 'end', onSessionEnded );

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

	return session;
}

function init({ renderer, scene, environment }) {

	const bgscene = scene.clone(false);
	renderFunc = function renderEnvironment(camera) {
	
		if (!inSession) return;
		renderer.clear();
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