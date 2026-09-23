"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Artwork } from "./coaster-art-preview";

type OcctMesh = {
  attributes: {
    position: { array: number[] };
    normal?: { array: number[] };
  };
  index?: { array: number[] };
  color?: number[];
};

function createGeometryFromOcct(mesh: OcctMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(mesh.attributes.position.array), 3)
  );
  if (mesh.attributes.normal?.array?.length) {
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(mesh.attributes.normal.array), 3)
    );
  } else {
    geometry.computeVertexNormals();
  }
  if (mesh.index?.array?.length) {
    geometry.setIndex(Array.from(mesh.index.array));
  }
  return geometry;
}

export default function CapArt3D({
  art,
  onClose,
}: {
  art: Artwork;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let animId = 0;
    const abortController = new AbortController();

    // Scene & Renderer
    const width = container.clientWidth || 465;
    const height = container.clientHeight || 355;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(2.4, 2.2, 2.8);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError("WebGL non disponibile sul dispositivo.");
      setLoading(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf0efed, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Keep cap above floor
    controls.minDistance = 2.0;
    controls.maxDistance = 6.5;
    controls.target.set(0, 0.55, 0);

    // Stop auto-rotation when user touches or clicks
    const stopAutoRotate = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener("start", stopAutoRotate);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Dynamic Artwork Texture
    const artCanvas = document.createElement("canvas");
    artCanvas.width = 1024;
    artCanvas.height = 1024;
    const artTexture = new THREE.CanvasTexture(artCanvas);
    artTexture.colorSpace = THREE.SRGBColorSpace;

    const defaultGreen = "#218c45";
    const accentColor =
      !art.foreground || art.foreground === "#ffffff"
        ? defaultGreen
        : art.foreground;

    function measuredWidth(
      text: string,
      size: number,
      font: Artwork["texts"][number]["font"]
    ) {
      const units = [...text].reduce(
        (sum, char) =>
          sum +
          (font === "mono"
            ? 0.62
            : /[MW@%]/.test(char)
            ? 0.95
            : /[ilI.,! '’]/.test(char)
            ? 0.3
            : 0.62),
        0
      );
      return Math.max(1, units * size);
    }

    function renderArtworkToCanvas() {
      const ctx = artCanvas.getContext("2d");
      if (!ctx) return;

      // 1. Background (always black for tocco)
      ctx.fillStyle = "#222222";
      ctx.fillRect(0, 0, 1024, 1024);

      // 2. Inner square border
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 11;
      ctx.strokeRect(52, 52, 920, 920);

      // 3. Vector paths
      ctx.save();
      ctx.scale(10.24, 10.24);
      for (const p of art.paths) {
        const path2d = new Path2D(p.d);
        if (p.fill) {
          ctx.fillStyle = accentColor;
          ctx.fill(path2d, "evenodd");
        } else {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = p.strokeWidth ?? 1.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke(path2d);
        }
      }
      ctx.restore();

      // 4. Texts with strict bounds constraint matching 2D SVG
      for (const t of art.texts) {
        if (!t.text.trim()) continue;
        ctx.save();
        const fontFam =
          t.font === "mono"
            ? "Roboto Mono, monospace"
            : t.font === "serif"
            ? "Noto Serif, serif"
            : "Noto Sans, sans-serif";
        const fontSize = t.size * 10.24;
        ctx.font = `700 ${fontSize}px ${fontFam}`;
        ctx.fillStyle = t.inverse ? "#222222" : accentColor;
        ctx.textAlign =
          t.anchor === "middle"
            ? "center"
            : t.anchor === "end"
            ? "right"
            : "left";
        ctx.textBaseline = "alphabetic";
        const targetX = t.x * 10.24;
        const targetY = t.y * 10.24;

        // Ensure text never overflows bounds
        const maxAllowed =
          Math.min(t.maxWidth, measuredWidth(t.text, t.size, t.font)) * 10.24;
        const measured = ctx.measureText(t.text).width;
        if (measured > maxAllowed && measured > 0) {
          const fitRatio = maxAllowed / measured;
          ctx.font = `700 ${Math.max(12, fontSize * fitRatio)}px ${fontFam}`;
        }
        ctx.fillText(t.text, targetX, targetY, maxAllowed);
        ctx.restore();
      }

      artTexture.needsUpdate = true;

      // Also render SVG markup directly for 100% crisp vector fidelity
      const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024"><rect width="100" height="100" fill="#222222" /><rect x="5" y="5" width="90" height="90" rx="3" fill="none" stroke="${accentColor}" stroke-width="1.1" />${art.paths.map(p => `<path d="${p.d}" fill="${p.fill ? accentColor : 'none'}" stroke="${p.fill ? 'none' : accentColor}" stroke-width="${p.strokeWidth || 1.4}" stroke-linecap="round" stroke-linejoin="round" />`).join('')}${art.texts.map(t => `<text x="${t.x}" y="${t.y}" text-anchor="${t.anchor}" font-family="${t.font === 'mono' ? 'Roboto Mono, monospace' : t.font === 'serif' ? 'Noto Serif, serif' : 'Noto Sans, sans-serif'}" font-size="${t.size}" font-weight="700" textLength="${Math.min(t.maxWidth, measuredWidth(t.text, t.size, t.font))}" lengthAdjust="spacingAndGlyphs" fill="${t.inverse ? '#222222' : accentColor}">${t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`).join('')}</svg>`;
      const img = new Image();
      img.onload = () => {
        if (destroyed) return;
        ctx.clearRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
        artTexture.needsUpdate = true;
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgMarkup);
    }

    renderArtworkToCanvas();

    // Load tocco CAD meshes
    let modelGroup: THREE.Group | null = null;
    const structureMat = new THREE.MeshStandardMaterial({
      color: 0x1f1f1f,
      roughness: 0.82,
      metalness: 0.05,
    });
    const fasciaMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.65,
      metalness: 0.1,
    });
    const topCapMat = new THREE.MeshStandardMaterial({
      map: artTexture,
      roughness: 0.55,
      metalness: 0.05,
    });

    fetch("/models/tocco-meshes.json", { signal: abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error("File CAD del tocco non trovato.");
        return res.json();
      })
      .then((meshes: OcctMesh[]) => {
        if (destroyed) return;

        modelGroup = new THREE.Group();
        const geometries = meshes.map(createGeometryFromOcct);

        const bounds = new THREE.Box3();
        geometries.forEach((geom) => {
          geom.computeBoundingBox();
          if (geom.boundingBox) bounds.union(geom.boundingBox);
        });

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bounds.getSize(size);
        bounds.getCenter(center);

        const maxAxis = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.4 / maxAxis;

        // Inner group to center the CAD coordinates
        const innerGroup = new THREE.Group();
        innerGroup.position.set(-center.x, -center.y, -center.z);

        // Analyze mesh parts:
        // mesh 0: base (struttura_base)
        // mesh 1: fascia (colored band)
        // mesh 2: coperchio (struttura_coperchio)
        // mesh 3: bordo (rim)
        geometries.forEach((geom, idx) => {
          const isAccent = idx === 1 || idx === 3;
          const mat = isAccent ? fasciaMat : structureMat;
          const mesh = new THREE.Mesh(geom, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          innerGroup.add(mesh);
        });

        // Top Lid Artwork Plane
        // In tocco CAD coordinates, top is at Z=37, lid size 65x65
        const topZ = bounds.max.z + 0.08;
        const lidPlaneGeom = new THREE.PlaneGeometry(62.5, 62.5);
        const lidPlane = new THREE.Mesh(lidPlaneGeom, topCapMat);
        lidPlane.position.set(0, 0, topZ);
        innerGroup.add(lidPlane);

        modelGroup.add(innerGroup);
        modelGroup.scale.set(scale, scale, scale);
        // Rotate so Z-up becomes Y-up
        modelGroup.rotation.x = -Math.PI / 2;
        // Position base on ground plane
        modelGroup.position.y = (center.z - bounds.min.z) * scale;

        scene.add(modelGroup);
        setLoading(false);
      })
      .catch((err) => {
        if (destroyed) return;
        console.error("3D model load error:", err);
        setError("Impossibile caricare il modello 3D.");
        setLoading(false);
      });

    // Animation loop
    const animate = () => {
      if (destroyed) return;
      controls.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      const nextW = container.clientWidth;
      const nextH = container.clientHeight;
      if (!nextW || !nextH) return;
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    return () => {
      destroyed = true;
      abortController.abort();
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.removeEventListener("start", stopAutoRotate);
      controls.dispose();
      structureMat.dispose();
      fasciaMat.dispose();
      topCapMat.dispose();
      artTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement) {
        renderer.domElement.remove();
      }
    };
  }, [art]);

  return (
    <div className="relative aspect-[465/355] w-full overflow-hidden rounded-[1.25rem] bg-[#f0efed]">
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0efed]/80 backdrop-blur-sm">
          <p className="text-sm font-semibold text-brand-dark/70">
            Caricamento tocco 3D…
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0efed] p-6 text-center text-sm text-red-700">
          <p>{error}</p>
        </div>
      )}

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-black/15 bg-white/90 px-3 py-1 text-xs font-bold text-brand-dark shadow-sm backdrop-blur hover:bg-white"
        >
          Vista 2D
        </button>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-md bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
        Trascina per ruotare · Zoom con la rotella
      </div>
    </div>
  );
}
