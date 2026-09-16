/**
 * CakeModel — Loads the 3D GLB cake model
 * Replaces the procedural cake with the Tripo GLB model.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import modelUrl from '../tripo_pbr_model_a701cdf4-b786-4afb-951b-5cffb792f0e4_meshopt.glb?url';

export class CakeModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'cakeModelGroup';
    this.topSurface = null;
    this.loaded = false;

    this._loadModel();
    this._createCandleSurface();

    return this.group;
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.name = 'cakeGLBModel';
        this.group.userData.gltfModel = model;

        // Enable shadows on all meshes
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Compute bounding box to center and scale the model
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Scale so the model is roughly the same size as the old cake (~3 units tall)
        const targetHeight = 3.0;
        const scale = targetHeight / size.y;
        model.scale.setScalar(scale);

        // Re-center horizontally, place base at y=0.12 (same as old cake)
        model.position.set(
          -center.x * scale,
          -box.min.y * scale + 0.12,
          -center.z * scale
        );

        this.group.add(model);
        this.loaded = true;

        // Update candle surface position based on actual model height
        const scaledTop = (box.max.y - box.min.y) * scale + 0.12;
        if (this.topSurface) {
          this.topSurface.position.y = scaledTop;
        }
      },
      (progress) => {
        // Loading progress (optional)
        if (progress.total > 0) {
          const pct = Math.round((progress.loaded / progress.total) * 100);
          console.log(`Loading cake model: ${pct}%`);
        }
      },
      (error) => {
        console.error('Error loading cake model:', error);
      }
    );
  }

  /**
   * Create an invisible surface for candle placement raycasting.
   * Uses a disc at the approximate top of the model.
   */
  _createCandleSurface() {
    const topGeo = new THREE.CircleGeometry(1.2, 32);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xBB1515,
      transparent: true,
      opacity: 0.01,
    });
    this.topSurface = new THREE.Mesh(topGeo, topMat);
    this.topSurface.rotation.x = -Math.PI / 2;
    this.topSurface.position.y = 2.82; // will be updated when model loads
    this.topSurface.name = 'cakeTop';
    this.group.add(this.topSurface);
  }

  /** Get the top surface mesh for raycasting */
  getTopSurface() {
    return this.topSurface;
  }
}
