import * as THREE from "three";

/**
 * Planar reflection for the polished granite floor (y = 0). The scene is rendered once more from the camera mirrored
 * in the floor plane, at half resolution with mipmaps; the floor samples it projectively, blurred by roughness and
 * weighted by Fresnel, so lights, walls and the board are mirrored softly in the stone like in a real polished floor.
 */
export function createFloorReflection(materials: THREE.MeshStandardMaterial[], opts: { strength?: number } = {}) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const textureMatrix = new THREE.Matrix4();
  const uniforms = { tReflect: { value: rt.texture as THREE.Texture }, uReflectMatrix: { value: textureMatrix }, uReflect: { value: opts.strength ?? 1 } };
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
  for (const m of materials) {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, r) => {
      prev.call(m, shader, r);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("void main() {", "uniform mat4 uReflectMatrix;\nvarying vec4 vReflUv;\nvarying vec3 vReflWorld;\nvoid main() {")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvec4 wpR = modelMatrix * vec4( transformed, 1.0 );\nvReflWorld = wpR.xyz;\nvReflUv = uReflectMatrix * wpR;");
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform sampler2D tReflect;\nuniform float uReflect;\nvarying vec4 vReflUv;\nvarying vec3 vReflWorld;\nvoid main() {")
        .replace("#include <opaque_fragment>", `
          if ( uReflect > 0.0 && vReflWorld.y < 0.06 ) {
            vec3 nV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
            float cosT = saturate( abs( dot( normalize( vViewPosition ), nV ) ) );
            float fres = 0.04 + 0.96 * pow( 1.0 - cosT, 5.0 );
            vec2 ruv = vReflUv.xy / vReflUv.w + normal.xy * 0.01;
            float lod = clamp( material.roughness * 5.0, 0.0, 5.0 );
            vec3 refl = textureLod( tReflect, ruv, lod ).rgb;
            float gloss = 1.0 - smoothstep( 0.2, 0.9, material.roughness );
            outgoingLight += refl * fres * gloss * uReflect;
          }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => `lm-refl-${m.uuid.slice(0, 4)}`;
    m.needsUpdate = true;
  }
  const mirrorCam = new THREE.PerspectiveCamera();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const tmp = new THREE.Vector3(), target = new THREE.Vector3(), dir = new THREE.Vector3();
  let enabled = true;
  return {
    setEnabled(on: boolean) { enabled = on; uniforms.uReflect.value = on ? opts.strength ?? 1 : 0; },
    setSize(w: number, h: number) { rt.setSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2))); },
    /** render the mirrored view; call before the main render of the scene */
    update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.PerspectiveCamera) {
      if (!enabled || cam.position.y < 0.05) return;
      // mirror the camera in the plane y = 0 (position, view direction and up)
      mirrorCam.copy(cam);
      mirrorCam.position.set(cam.position.x, -cam.position.y, cam.position.z);
      cam.getWorldDirection(dir); target.copy(cam.position).add(dir); target.y = -target.y;
      tmp.set(0, 1, 0).applyQuaternion(cam.quaternion); mirrorCam.up.set(tmp.x, -tmp.y, tmp.z);
      mirrorCam.lookAt(target);
      mirrorCam.updateMatrixWorld(); mirrorCam.projectionMatrix.copy(cam.projectionMatrix); mirrorCam.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
      textureMatrix.copy(bias).multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
      // never sample the target while rendering into it
      uniforms.tReflect.value = blank;
      const prevRT = renderer.getRenderTarget(), prevXr = renderer.xr.enabled, prevShadow = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false; renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mirrorCam);
      renderer.setRenderTarget(prevRT); renderer.xr.enabled = prevXr; renderer.shadowMap.autoUpdate = prevShadow;
      uniforms.tReflect.value = rt.texture;
    },
    dispose() { rt.dispose(); blank.dispose(); },
  };
}
