/* global AFRAME  */

AFRAME.registerComponent("hide-in-ar-mode", {
	// Set this object invisible while in AR mode.
	// TODO: could this be replaced with bind="visible: !ar-mode"
	// with https://www.npmjs.com/package/aframe-state-component ?
	init: function () {
		this.el.sceneEl.addEventListener("enter-vr", () => {
			if (this.el.sceneEl.is("ar-mode")) {
				this.el.setAttribute("visible", false);
			}
		});
		this.el.sceneEl.addEventListener("exit-vr", () => {
			this.el.setAttribute("visible", true);
		});
	},
});

AFRAME.registerComponent("occlusion-material", {
	update: function () {
		this.el.components.material.material.colorWrite = false;
	},
});


class HitTest {
	constructor(renderer, options) {

		this.renderer = renderer;
		this.xrHitTestSource = null;

		renderer.xr.addEventListener("sessionend", () => this.xrHitTestSource = null);
		renderer.xr.addEventListener("sessionstart", () => this.sessionStart(options));
		
		if (this.renderer.xr.isPresenting) {
			this.sessionStart(options)
		}
	}

	async sessionStart(options) {
		this.session = this.renderer.xr.getSession();
		
		if (options.space) {
			this.xrHitTestSource = await this.session.requestHitTestSource(options);
		} else if ( options.profile ) {
			this.xrHitTestSource = await this.session.requestHitTestSourceForTransientInput(options);
			this.transient = true;
		} 
	}

	doHit(frame) {
		if (!this.renderer.xr.isPresenting) return;
		const refSpace = this.renderer.xr.getReferenceSpace();
		const xrViewerPose = frame.getViewerPose(refSpace);

		if (this.xrHitTestSource && xrViewerPose) {

			if (this.transient) {
				const hitTestResults = frame.getHitTestResultsForTransientInput(this.xrHitTestSource);
				if (hitTestResults.length > 0) {
					const results = hitTestResults[0].results;
					if (results.length > 0) {
						const pose = results[0].getPose(refSpace);
						return pose;
					} else {
						return false
					}
				} else {
					return false;
				}
			} else {
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
}

// Usage
// Needs the master version of AFrame and the hit-test optional feature
// Add ar-hit-test to the reticle
const hitTestCache = new Map();
AFRAME.registerComponent("ar-hit-test", {
	schema: {
		offset: { type: "vec2", default: { x: 0, y: 0 } },
	},

	init: function () {
		this.hitTest = null;

		this.el.sceneEl.renderer.xr.addEventListener("sessionend", () => {
			this.hitTest = null;
		});

		this.el.sceneEl.renderer.xr.addEventListener("sessionstart", async () => {
			const renderer = this.el.sceneEl.renderer;
			const session = this.session = renderer.xr.getSession();

			// Default to selecting through the face
			const viewerSpace = await session.requestReferenceSpace('viewer');
			this.hitTest = new HitTest(renderer, {
				space: viewerSpace
			});

			// These are transient inputs so need to be handled seperately
			const profileToSupport = "generic-touchscreen";
			const transientHitTest = new HitTest(renderer, {
				profile: profileToSupport,
			});

			session.addEventListener('selectstart', ({ inputSource }) => {
				if (inputSource.profiles[0] === profileToSupport) {
					this.hitTest = transientHitTest;
				} else {
					this.hitTest = hitTestCache.get(inputSource) || new HitTest(renderer, {
						space: inputSource.targetRaySpace
					});
					hitTestCache.set(inputSource, this.hitTest);
				}
				this.el.setAttribute('visible', true);
			});

			session.addEventListener('selectend', ({ inputSource }) => {
				this.el.emit('select', { inputSource });
				this.el.setAttribute('visible', false);
				this.hitTest = null;
			});
		});
	},
	tick: function () {
		const frame = this.el.sceneEl.frame;
		if (this.hitTest) {
			const pose = this.hitTest.doHit(frame);
			if (pose) {
				this.el.setAttribute('visible', true);
				this.el.setAttribute("position", pose.transform.position);
				this.el.object3D.quaternion.copy(pose.transform.orientation);
			}
		}
	},
});
