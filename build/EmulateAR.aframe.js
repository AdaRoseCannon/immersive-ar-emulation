const e=navigator.xr.isSessionSupported.bind(navigator.xr),t=navigator.xr.requestSession.bind(navigator.xr);let n,r,i=!1,s=function(){};async function o(e){return new c(this,e)}async function a(e){return new l(this,e)}class c{constructor(e,{space:t,offsetRay:n}){this.__space=t,this.__offsetRay=n,this.__session=e}cancel(){this.__space=null,this.__offsetRay=null,this.__session=null,this.__canceled=!0}}class u{constructor(e,t,n){this.__transform=new window.XRRigidTransform(t,n),this.__frame=e}getPose(e){const t=r.getOffsetReferenceSpace(this.__transform);return this.__frame.getPose(t,e)}}class l{constructor(e,{space:t,offsetRay:n}){}cancel(){}}function f(){return[]}function d(){i=!1}function m(t){return console.log("Proxied isSessionSupported"),e("immersive-ar"===t?"immersive-vr":t)}let p=function(){};async function g(n,r){if(console.log("Proxied requestSession"),"immersive-ar"!=n||await e("immersive-ar"))return t(n,r);n="immersive-vr";const s=[];r.optionalFeatures=r.optionalFeatures.filter((function(e){switch(e){case"hit-test":case"lighting-estimation":return s.push(e),!1;default:return!0}}));const c=await t(n,r);return i=!0,c.addEventListener("end",d),s.includes("hit-test")&&function(e){Object.defineProperty(e,"requestHitTestSource",{value:o,configurable:!0}),Object.defineProperty(e,"requestHitTestSourceForTransientInput",{value:a,configurable:!0});const t=e.requestAnimationFrame.bind(e);Object.defineProperty(e,"requestAnimationFrame",{value:function(e){t((function(t,n){Object.defineProperty(n,"getHitTestResultsForTransientInput",{value:f.bind(n),configurable:!0}),Object.defineProperty(n,"getHitTestResults",{value:p.bind(n),configurable:!0}),e(t,n)}))},configurable:!0})}(c),s.includes("lighting-estimation")&&console.log("lighting-estimation is not supported by the immersive-ar emulator"),c}function v({renderer:e,environment:t}){const o=new THREE.Scene;s=function(t){if(e.clear(),!i)return;const n=t.parent;o.add(t),e.render(o,t),e.clearDepth(),n.add(t)},e.autoClear=!1,e.xr.addEventListener("sessionstart",(function(){var t;t=e.xr.getReferenceSpace(),r=t})),t.traverse((e=>{e.geometry&&e.material&&e.geometry.computeFaceNormals()})),o.add(t),n=t;const a=new THREE.Quaternion,c=new THREE.Quaternion,l=new THREE.Vector3,f=new THREE.Vector3;const d=new THREE.Vector3,m=new THREE.Raycaster;p=function(e){if(!n)return[];const t=this,i=e.__offsetRay?e.__space.getOffsetReferenceSpace(e.__offsetRay):e.__space,s=t.getPose(i,r);return null===s?[]:(d.set(0,0,-1),d.applyQuaternion(s.transform.orientation),m.set(s.transform.position,d),m.intersectObject(n,!0).map((e=>new u(t,e.point,function(e,t){e.normalize(),t.normalize(),l.set(0,1,0),a.setFromUnitVectors(l,e);const n=e.lengthSq(),r=t.dot(e);return f.copy(e).multiplyScalar(-1*r/n).add(t),l.set(0,0,-1),l.applyQuaternion(a),c.setFromUnitVectors(l,f),a.premultiply(c),a.clone()}(e.face.normal,d)))))}}!async function(){navigator.xr.requestSession=g.bind(navigator.xr),navigator.xr.isSessionSupported=m.bind(navigator.xr)}(),window.addEventListener("DOMContentLoaded",(function(){const e=new THREE.GLTFLoader;AFRAME.registerSystem("my-component",{schema:{},init:function(){const t=this.el.renderer,n=new THREE.Object3D;var r;(r="https://ada.is/immersive-ar-emulation/assets/room.glb",new Promise(((t,n)=>{e.load(r,(function(e){t(e)}),(function(e){}),(function(e){n(e)}))}))).then((({scene:e})=>n.add(e))),v({renderer:t,environment:n})},tick(){var e;e=this.el.camera,s(e)}})}));
//# sourceMappingURL=EmulateAR.aframe.js.map
