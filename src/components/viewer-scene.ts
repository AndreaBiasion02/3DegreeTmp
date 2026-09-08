import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { colorRole, type ModelColors } from "@/lib/model-colors";
export type SceneControls = {
  dispose: () => void;
  rotate: (direction: number) => void;
  zoom: (factor: number) => void;
  setColors: (colors: ModelColors) => void;
};
export async function createScene(
  host: HTMLDivElement,
  url: string,
  signal: AbortSignal
): Promise<SceneControls> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Model unavailable");
  const gltf = await new GLTFLoader().parseAsync(
    await response.arrayBuffer(),
    ""
  );
  const releaseModel = () =>
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
  if (signal.aborted) {
    releaseModel();
    throw new Error("Cancelled");
  }
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    releaseModel();
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xf0efed, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Vista tridimensionale del modello; usa i pulsanti sottostanti per ruotare e ingrandire"
  );
  renderer.domElement.setAttribute("role", "img");
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x606860, 3));
  const light = new THREE.DirectionalLight(0xffffff, 4);
  light.position.set(3, 5, 4);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xffffff, 2);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const model = gltf.scene;
  const colored: Array<{
    material: THREE.MeshStandardMaterial;
    role: "structure" | "accent";
  }> = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const attribute = object.geometry.getAttribute("color");
    const role = colorRole(
      object.name,
      attribute
        ? [attribute.getX(0), attribute.getY(0), attribute.getZ(0)]
        : undefined
    );
    if (role === "fixed") return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const copies = materials.map((original) => {
      const material = original.clone() as THREE.MeshStandardMaterial;
      material.vertexColors = false;
      colored.push({ material, role });
      return material;
    });
    materials.forEach((material) => material.dispose());
    object.material = Array.isArray(object.material) ? copies : copies[0];
  });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
  const radius = size.length() / 2;
  const camera = new THREE.PerspectiveCamera(
    35,
    1,
    Math.max(radius / 1000, 0.001),
    radius * 100
  );
  const direction = new THREE.Vector3(1, 0.8, 1.4).normalize();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.enableZoom = true;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  controls.minDistance = radius * 1.3;
  controls.maxDistance = radius * 10;
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    const halfFov = Math.atan(
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        Math.min(1, camera.aspect)
    );
    camera.position
      .copy(direction)
      .multiplyScalar((radius / Math.sin(halfFov)) * 1.08);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    controls.update();
    render();
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    renderer.domElement.setAttribute(
      "aria-label",
      "Vista 3D interrotta; torna all’immagine per continuare"
    );
  };
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  controls.addEventListener("change", render);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  return {
    setColors(colors) {
      colored.forEach(({ material, role }) => material.color.set(colors[role]));
      render();
    },
    rotate(direction) {
      const position = camera.position.clone().sub(controls.target);
      position.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (direction * Math.PI) / 8
      );
      camera.position.copy(controls.target).add(position);
      controls.update();
      render();
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(
        THREE.MathUtils.clamp(
          offset.length() * factor,
          controls.minDistance,
          controls.maxDistance
        )
      );
      camera.position.copy(controls.target).add(offset);
      controls.update();
      render();
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      releaseModel();
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
