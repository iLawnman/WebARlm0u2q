export const spatialMap = {
  version: 2,
  type: "webxr-spatial-map",
  startedAt: null,
  lastUpdate: null,
  frames: 0,
  xrFrames: 0,
  renderFrames: 0,

  session: {
    supported: false,
    active: false,
    visibilityState: null,
    environmentBlendMode: null,
    interactionMode: null,
    depthUsage: null,
    depthDataFormat: null,
    inputSources: 0
  },

  features: {
    planeDetection: false,
    hitTest: false,
    depthSensing: false,
    localFloor: false
  },

  camera: {
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 }
  },

  planes: {},

  depth: {
    frames: 0,
    samples: 0,
    worldPoints: 0,
    width: 0,
    height: 0,
    rawValueToMeters: 0,
    format: null,
    usage: null
  },

  hitTest: {
    available: false,
    hits: 0,
    position: null,
    distance: null
  }
};

export function updateSessionInfo(session) {
  if (!session) {
    spatialMap.session.active = false;
    return;
  }
  spatialMap.session.active = true;
  spatialMap.session.visibilityState = session.visibilityState || null;
  spatialMap.session.environmentBlendMode = session.environmentBlendMode || null;
  spatialMap.session.interactionMode = session.interactionMode || null;
  spatialMap.session.depthUsage = session.depthUsage || null;
  spatialMap.session.depthDataFormat = session.depthDataFormat || null;
  spatialMap.session.inputSources = session.inputSources ? session.inputSources.length : 0;
}

export function updateCameraInfo(renderer) {
  const xrCamera = renderer.xr.getCamera();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  xrCamera.getWorldPosition(position);
  xrCamera.getWorldQuaternion(quaternion);
  spatialMap.camera.position = { x: position.x, y: position.y, z: position.z };
  spatialMap.camera.quaternion = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
}