// arscene.js - THREE scene, renderer and interaction loop
//
// REFACTOR NOTE (CSS3D -> three-mesh-ui):
// This class no longer creates a CSS3DRenderer / DOM overlay layer. All AR UI
// is now built from real THREE.Object3D meshes (three-mesh-ui Blocks), so a
// single WebGL render pass is enough - and, unlike CSS3DObject, this actually
// renders inside a WebXR immersive session (CSS3DRenderer never did).
//
// This class also absorbs the pointer/touch raycasting logic that used to
// live in arinput.js. Instead of raycasting against invisible proxy meshes
// tied to DOM elements, it raycasts directly against the interactive
// three-mesh-ui Blocks and drives their idle/hovered/selected states, using
// the same pattern as the official three-mesh-ui "interactive_button"
// example (state changes are de-duped internally by the library, so onSet
// callbacks fire exactly once per press - see ARPanel for where those
// callbacks are defined).
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export class ARScene {
  constructor(ui) {
    this.ui = ui;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    document.body.appendChild(this.renderer.domElement);

    // -- interaction state (formerly arinput.js) --
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._pointer.x = this._pointer.y = null;
    this._selectState = false;
    this._interactives = []; // three-mesh-ui Blocks currently registered as clickable

    this.setupLighting();
    this.setupStaticFloor();
    this._setupInteractionListeners();

    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupLighting() {
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    light.position.set(0, 2, 0);
    this.scene.add(light);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(1, 3, 2);
    this.scene.add(dir);
  }

  setupStaticFloor() {
    const gridHelper = new THREE.GridHelper(10, 20, 0x00ff00, 0x444444);
    gridHelper.position.set(0, 0, 0);
    this.scene.add(gridHelper);

    const boxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const boxMat = new THREE.MeshNormalMaterial();
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 0.1, -1);
    this.scene.add(box);
  }

  createSphereMesh(color = 0xff00ff) {
    const geo = new THREE.SphereGeometry(0.08, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.4,
      emissive: color,
      emissiveIntensity: 0.15
    });
    return new THREE.Mesh(geo, mat);
  }

  // ---- interactive Block registry ----
  // Call this for every three-mesh-ui Block that should react to
  // clicks/taps (buttons, sliders, modal close button, etc). The block
  // is expected to already have 'idle' / 'hovered' / 'selected' states
  // configured via block.setupState(...) - see ARPanel.
  registerInteractive(block) {
    if (block && !this._interactives.includes(block)) {
      this._interactives.push(block);
      if (block.setState) block.setState('idle');
    }
  }

  unregisterInteractive(block) {
    const i = this._interactives.indexOf(block);
    if (i !== -1) this._interactives.splice(i, 1);
  }

  clearInteractives() {
    this._interactives.length = 0;
  }

  _setupInteractionListeners() {
    const dom = this.renderer.domElement;

    const updatePointer = (clientX, clientY) => {
      const rect = dom.getBoundingClientRect();
      this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    dom.addEventListener('pointermove', (e) => updatePointer(e.clientX, e.clientY));
    dom.addEventListener('pointerdown', (e) => {
      updatePointer(e.clientX, e.clientY);
      this._selectState = true;
    });
    window.addEventListener('pointerup', () => {
      this._selectState = false;
    });

    dom.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) updatePointer(t.clientX, t.clientY);
      this._selectState = true;
    }, { passive: true });
    dom.addEventListener('touchend', () => {
      this._selectState = false;
      this._pointer.x = this._pointer.y = null;
    }, { passive: true });
  }

  // Raycasts the pointer against every registered interactive Block and
  // drives idle/hovered/selected states. Mirrors three-mesh-ui's own
  // "interactive_button" example.
  _updateInteractions() {
    if (this._interactives.length === 0) return;

    let closest = null;

    if (this._pointer.x !== null && this._pointer.y !== null) {
      this._raycaster.setFromCamera(this._pointer, this.camera);

      for (const block of this._interactives) {
        const hits = this._raycaster.intersectObject(block, true);
        if (hits[0] && (!closest || hits[0].distance < closest.distance)) {
          closest = { distance: hits[0].distance, block };
        }
      }
    }

    for (const block of this._interactives) {
      if (!block.isUI) continue;
      if (closest && closest.block === block) {
        block.setState(this._selectState ? 'selected' : 'hovered');
      } else {
        block.setState('idle');
      }
    }
  }

  render() {
    // three-mesh-ui layouts/text meshes must be refreshed manually every frame
    ThreeMeshUI.update();
    this._updateInteractions();
    this.renderer.render(this.scene, this.camera);
  }
}
