/**
 * CakeCutter — 3D Cake Cutting System
 * Creates an animated knife, removes the wedge from the original cake using clipping planes,
 * and extracts the slice piece using a cloned cake model with inverse clipping planes so the
 * cut slice piece displays the authentic Spider-Man design, 3D frosting rosettes, and layered sponge interior.
 */
import * as THREE from 'three';

export class CakeCutter {
  constructor(cakeScene) {
    this.cakeScene = cakeScene;
    this.group = new THREE.Group();
    this.group.name = 'cakeCutterGroup';
    this.knife = null;
    this.slicePieceGroup = null;
    this.cutLines = [];
    this.cutCount = 0;
    this.isCutting = false;
    this.isComplete = false;
    this.interiorFaces = [];
    this.clippedMeshes = [];
    this.reparentedCandles = [];

    // Slice geometry & cake dimensions (matches scaled Tripo GLB cake)
    this.sliceAngle = Math.PI / 4; // 45° slice
    this.cakeRadius = 1.82; // Matches exact outer rim of the frosting rosettes
    this.cakeHeight = 3.0; // Scaled height
    this.cakeBaseY = 0.12;

    this.layerTexture = this._createCakeLayerTexture();

    this._createKnife();
    this._createSlicePieceGroup();
    this._createCutLines();
    this._createClippingPlanes();
    this._createInteriorFaces();

    // Start hidden
    this.group.visible = false;
    cakeScene.addToCake(this.group);
  }

  // ==========================
  // CAKE LAYER TEXTURE (SPONGE + CREAM)
  // ==========================

  /** Create a high-res cake layer texture for the interior cut walls */
  _createCakeLayerTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw cake layers from bottom to top
    const layers = [
      { color: '#3D1C1C', pct: 0.12 },  // Chocolate base
      { color: '#8B1A1A', pct: 0.20 },  // Red velvet bottom
      { color: '#FFF5EB', pct: 0.05 },  // Vanilla cream filling
      { color: '#E8C090', pct: 0.18 },  // Golden sponge cake
      { color: '#FFB2D2', pct: 0.05 },  // Strawberry cream filling
      { color: '#8B1A1A', pct: 0.20 },  // Red velvet top
      { color: '#FFF5EB', pct: 0.05 },  // Vanilla frosting
      { color: '#C81E1E', pct: 0.15 },  // Spider-Man red top icing
    ];

    let yPos = canvas.height;
    layers.forEach(({ color, pct }) => {
      const h = pct * canvas.height;
      ctx.fillStyle = color;
      ctx.fillRect(0, yPos - h, canvas.width, h);
      yPos -= h;
    });

    // Add subtle sponge crumbs texture for realism
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.16)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // ==========================
  // CLIPPING PLANES
  // ==========================

  /**
   * Create clipping planes:
   * 1. clipPlane1 & clipPlane2: for the main cake (clipIntersection = true).
   *    Removes the 45° wedge region.
   * 2. baseSlicePlane1 & baseSlicePlane2: for the slice piece (clipIntersection = false).
   *    Keeps ONLY the 45° wedge region from the cloned cake model!
   */
  _createClippingPlanes() {
    const halfAngle = this.sliceAngle / 2;

    // Main cake planes (point outward from wedge, intersect to remove wedge)
    this.clipPlane1 = new THREE.Plane(
      new THREE.Vector3(-Math.sin(halfAngle), 0, -Math.cos(halfAngle)),
      0
    );
    this.clipPlane2 = new THREE.Plane(
      new THREE.Vector3(-Math.sin(halfAngle), 0, Math.cos(halfAngle)),
      0
    );

    // Slice planes in slicePieceGroup local coordinates (normals point INTO wedge)
    this.baseSlicePlane1 = new THREE.Plane(
      new THREE.Vector3(Math.sin(halfAngle), 0, Math.cos(halfAngle)),
      0
    );
    this.baseSlicePlane2 = new THREE.Plane(
      new THREE.Vector3(Math.sin(halfAngle), 0, -Math.cos(halfAngle)),
      0
    );

    // World-space planes for slice materials, dynamically updated as slice moves
    this.sliceClipPlane1 = this.baseSlicePlane1.clone();
    this.sliceClipPlane2 = this.baseSlicePlane2.clone();
  }

  /** Dynamically transform the slice clipping planes by the slice group's world matrix */
  _updateSliceClippingPlanes() {
    if (!this.slicePieceGroup || !this.baseSlicePlane1) return;
    this.slicePieceGroup.updateMatrixWorld(true);
    this.sliceClipPlane1.copy(this.baseSlicePlane1).applyMatrix4(this.slicePieceGroup.matrixWorld);
    this.sliceClipPlane2.copy(this.baseSlicePlane2).applyMatrix4(this.slicePieceGroup.matrixWorld);
  }

  /** Apply clipping planes to the original cake model (excluding cutter & candles) */
  _applyClipping() {
    const cakeGroup = this.cakeScene.getCakeGroup();
    const cutterGroupId = this.group.id;

    cakeGroup.traverse((child) => {
      if (!child.isMesh) return;

      // Skip meshes that belong to cutter group
      let p = child.parent;
      let belongsToCutter = false;
      while (p) {
        if (p.id === cutterGroupId) { belongsToCutter = true; break; }
        p = p.parent;
      }
      if (belongsToCutter) return;

      // Skip candles and raycast disc
      if (child.name === 'cakeTop') return;
      let checkParent = child;
      let isCandle = false;
      while (checkParent) {
        if (checkParent.userData?.isCandle) { isCandle = true; break; }
        checkParent = checkParent.parent;
      }
      if (isCandle) return;

      // Clone material so we don't permanently modify original materials
      if (!child.userData._origMaterial) {
        child.userData._origMaterial = child.material;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(m => m.clone());
        } else {
          child.material = child.material.clone();
        }
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(m => {
        m.clippingPlanes = [this.clipPlane1, this.clipPlane2];
        m.clipIntersection = true;
        m.needsUpdate = true;
      });

      this.clippedMeshes.push(child);
    });
  }

  /** Remove clipping from original cake meshes and restore original materials */
  _removeClipping() {
    this.clippedMeshes.forEach((child) => {
      if (child.userData._origMaterial) {
        const currentMats = Array.isArray(child.material) ? child.material : [child.material];
        currentMats.forEach(m => {
          if (m !== child.userData._origMaterial) m.dispose();
        });
        child.material = child.userData._origMaterial;
        delete child.userData._origMaterial;
      }
    });
    this.clippedMeshes = [];
  }

  // ==========================
  // INTERIOR CROSS-SECTION FACES (FOR MAIN CAKE GAP)
  // ==========================

  /** Create two tall planes at the cut angles on the main cake showing sponge/cream layers */
  _createInteriorFaces() {
    const faceMat = new THREE.MeshStandardMaterial({
      map: this.layerTexture,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const halfAngle = this.sliceAngle / 2;
    const faceHeight = this.cakeHeight - 0.05;
    const faceWidth = this.cakeRadius;

    // Face 1 — at cut angle -halfAngle
    const faceGeo1 = new THREE.PlaneGeometry(faceWidth, faceHeight);
    const face1 = new THREE.Mesh(faceGeo1, faceMat.clone());
    face1.position.set(
      Math.cos(-halfAngle) * faceWidth * 0.5,
      this.cakeBaseY + faceHeight * 0.5,
      Math.sin(-halfAngle) * faceWidth * 0.5
    );
    face1.rotation.y = halfAngle;
    face1.visible = false;
    face1.userData.isInteriorFace = true;
    this.group.add(face1);
    this.interiorFaces.push(face1);

    // Face 2 — at cut angle +halfAngle
    const faceGeo2 = new THREE.PlaneGeometry(faceWidth, faceHeight);
    const face2 = new THREE.Mesh(faceGeo2, faceMat.clone());
    face2.position.set(
      Math.cos(halfAngle) * faceWidth * 0.5,
      this.cakeBaseY + faceHeight * 0.5,
      Math.sin(halfAngle) * faceWidth * 0.5
    );
    face2.rotation.y = -halfAngle;
    face2.visible = false;
    face2.userData.isInteriorFace = true;
    this.group.add(face2);
    this.interiorFaces.push(face2);

    // Bottom face of the cut (floor of the gap)
    const bottomShape = new THREE.Shape();
    bottomShape.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) {
      const a = -halfAngle + (this.sliceAngle) * (i / 16);
      bottomShape.lineTo(Math.cos(a) * (this.cakeRadius + 0.02), Math.sin(a) * (this.cakeRadius + 0.02));
    }
    bottomShape.lineTo(0, 0);

    const bottomGeo = new THREE.ShapeGeometry(bottomShape);
    const bottomMat = new THREE.MeshStandardMaterial({
      color: 0xDFC99C, // Champagne gold cake board beneath cake
      roughness: 0.35,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const bottomFace = new THREE.Mesh(bottomGeo, bottomMat);
    bottomFace.rotation.x = -Math.PI / 2;
    bottomFace.position.y = this.cakeBaseY + 0.02;
    bottomFace.visible = false;
    bottomFace.userData.isInteriorFace = true;
    this.group.add(bottomFace);
    this.interiorFaces.push(bottomFace);
  }

  // ==========================
  // SLICE PIECE (AUTHENTIC CAKE DESIGN)
  // ==========================

  _createSlicePieceGroup() {
    this.slicePieceGroup = new THREE.Group();
    this.slicePieceGroup.name = 'slicePieceGroup';
    this.slicePieceGroup.visible = false;
    this.group.add(this.slicePieceGroup);
  }

  /**
   * Prepares the realistic slice piece:
   * 1. Clones the actual GLB cake model so the slice has the exact Spider-Man design,
   *    frosting rosettes, web pattern, and colors.
   * 2. Applies inverse clipping planes so ONLY the wedge is kept from the clone.
   * 3. Adds matching sponge/cream layer interior cut walls to the slice sides.
   * 4. Adds bottom base face so the piece is 100% closed and solid.
   * 5. Reparents any candles on the slice to travel with it.
   */
  _setupSlicePiece() {
    // Clear any previous slice piece children
    while (this.slicePieceGroup.children.length > 0) {
      const child = this.slicePieceGroup.children[0];
      this.slicePieceGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    const cakeGroup = this.cakeScene.getCakeGroup();
    const halfAngle = this.sliceAngle / 2;

    // 1. Locate the GLB cake model in the scene
    let glbModel = cakeGroup.getObjectByName('cakeGLBModel');
    if (!glbModel) {
      cakeGroup.traverse((child) => {
        if (child.isMesh && child.name !== 'cakeTop' && !child.userData?.isCandle && !child.userData?.isInteriorFace) {
          let root = child;
          while (root.parent && root.parent !== cakeGroup) {
            root = root.parent;
          }
          glbModel = root;
        }
      });
    }

    // 2. Clone the actual GLB cake model to give the slice the authentic Spider-Man design!
    if (glbModel) {
      const clonedModel = glbModel.clone(true);
      clonedModel.traverse((child) => {
        if (child.isMesh) {
          // Independent material instance for cloned mesh
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
          } else {
            child.material = child.material.clone();
          }
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(m => {
            m.clippingPlanes = [this.sliceClipPlane1, this.sliceClipPlane2];
            m.clipIntersection = false; // Union clipping: KEEP ONLY THE WEDGE!
            m.needsUpdate = true;
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.slicePieceGroup.add(clonedModel);
    }

    // 3. Cut-wall cross sections on the slice piece (sponge & cream layer texture)
    const faceMat = new THREE.MeshStandardMaterial({
      map: this.layerTexture,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const faceHeight = this.cakeHeight - 0.05;
    const faceWidth = this.cakeRadius;

    // Side face 1 on the slice (at angle -halfAngle, running along cut line)
    const sliceFace1 = new THREE.Mesh(new THREE.PlaneGeometry(faceWidth, faceHeight), faceMat.clone());
    sliceFace1.position.set(
      Math.cos(-halfAngle) * faceWidth * 0.5,
      this.cakeBaseY + faceHeight * 0.5,
      Math.sin(-halfAngle) * faceWidth * 0.5
    );
    sliceFace1.rotation.y = halfAngle;
    this.slicePieceGroup.add(sliceFace1);

    // Side face 2 on the slice (at angle +halfAngle, running along cut line)
    const sliceFace2 = new THREE.Mesh(new THREE.PlaneGeometry(faceWidth, faceHeight), faceMat.clone());
    sliceFace2.position.set(
      Math.cos(halfAngle) * faceWidth * 0.5,
      this.cakeBaseY + faceHeight * 0.5,
      Math.sin(halfAngle) * faceWidth * 0.5
    );
    sliceFace2.rotation.y = -halfAngle;
    this.slicePieceGroup.add(sliceFace2);

    // Bottom face on the slice
    const bottomShape = new THREE.Shape();
    bottomShape.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) {
      const a = -halfAngle + (this.sliceAngle) * (i / 16);
      bottomShape.lineTo(Math.cos(a) * (this.cakeRadius + 0.02), Math.sin(a) * (this.cakeRadius + 0.02));
    }
    bottomShape.lineTo(0, 0);

    const sliceBottom = new THREE.Mesh(
      new THREE.ShapeGeometry(bottomShape),
      new THREE.MeshStandardMaterial({ color: 0x3D1C1C, roughness: 0.95, side: THREE.DoubleSide })
    );
    sliceBottom.rotation.x = -Math.PI / 2;
    sliceBottom.position.y = this.cakeBaseY + 0.02;
    this.slicePieceGroup.add(sliceBottom);

    // 4. Reparent any candles that sit on the slice so they travel along with it
    this.reparentedCandles = [];
    cakeGroup.children.forEach((child) => {
      if (child.userData?.isCandle) {
        const pos = child.position;
        const angle = Math.atan2(pos.z, pos.x);
        const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (dist <= this.cakeRadius && angle >= -halfAngle && angle <= halfAngle) {
          child.userData._origPosOnCake = child.position.clone();
          child.userData._origRotOnCake = child.rotation.clone();
          child.userData._origParentOnCake = child.parent;
          this.reparentedCandles.push(child);
        }
      }
    });
    this.reparentedCandles.forEach((c) => {
      this.slicePieceGroup.attach(c);
    });

    // 6. Reset position & align clipping planes
    this.slicePieceGroup.position.set(0, 0, 0);
    this.slicePieceGroup.rotation.set(0, 0, 0);
    this._updateSliceClippingPlanes();
    this.slicePieceGroup.visible = true;
  }

  // ==========================
  // KNIFE & CUT LINES
  // ==========================

  /** Create a procedural chef's knife */
  _createKnife() {
    this.knife = new THREE.Group();

    // Blade — polished steel
    const bladeGeo = new THREE.BoxGeometry(0.04, 2.6, 0.7);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xE8E8E8,
      metalness: 0.95,
      roughness: 0.1,
      envMapIntensity: 1.2,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0;
    blade.castShadow = true;
    this.knife.add(blade);

    // Blade edge highlight
    const edgeGeo = new THREE.BoxGeometry(0.005, 2.6, 0.7);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      metalness: 1.0,
      roughness: 0.0,
      emissive: 0xCCCCCC,
      emissiveIntensity: 0.3,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(-0.022, 0, 0);
    this.knife.add(edge);

    // Handle — dark wood
    const handleGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.7, 16);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x5D3A1A,
      roughness: 0.6,
      metalness: 0.05,
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = 1.6;
    handle.castShadow = true;
    this.knife.add(handle);

    // Gold handle bolster
    const capGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.9,
      roughness: 0.2,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.28;
    this.knife.add(cap);

    // Position knife above cake
    this.knife.position.set(0, this.cakeHeight + 4, 0);
    this.knife.visible = false;
    this.group.add(this.knife);
  }

  /** Create cut line indicators on cake surface */
  _createCutLines() {
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x2A0A0A,
      transparent: true,
      opacity: 0,
    });

    for (let i = 0; i < 2; i++) {
      const angle = (i === 0) ? -this.sliceAngle / 2 : this.sliceAngle / 2;
      const lineGeo = new THREE.BoxGeometry(this.cakeRadius, 0.025, 0.025);
      const line = new THREE.Mesh(lineGeo, lineMat.clone());

      line.position.set(
        Math.cos(angle) * this.cakeRadius * 0.5,
        this.cakeHeight + this.cakeBaseY + 0.02,
        Math.sin(angle) * this.cakeRadius * 0.5
      );
      line.rotation.y = -angle;
      line.visible = false;

      this.cutLines.push(line);
      this.group.add(line);
    }
  }

  // ==========================
  // SHOW / HIDE
  // ==========================

  show() {
    this.group.visible = true;
    this.cutCount = 0;
    this.isCutting = false;
    this.isComplete = false;
    this.knife.visible = true;

    this.knife.position.set(0, this.cakeHeight + 4, 0);
    this._animateKnifeEntrance();
  }

  hide() {
    this.group.visible = false;
    this.knife.visible = false;

    // Restore any reparented candles back to their original position on the cake
    if (this.reparentedCandles && this.reparentedCandles.length > 0) {
      this.reparentedCandles.forEach(c => {
        const targetParent = c.userData._origParentOnCake || this.cakeScene.getCakeGroup();
        targetParent.add(c);
        if (c.userData._origPosOnCake) {
          c.position.copy(c.userData._origPosOnCake);
          delete c.userData._origPosOnCake;
        }
        if (c.userData._origRotOnCake) {
          c.rotation.copy(c.userData._origRotOnCake);
          delete c.userData._origRotOnCake;
        }
        delete c.userData._origParentOnCake;
      });
      this.reparentedCandles = [];
    }

    if (this.slicePieceGroup) {
      this.slicePieceGroup.visible = false;
      this.slicePieceGroup.position.set(0, 0, 0);
      this.slicePieceGroup.rotation.set(0, 0, 0);
      this._updateSliceClippingPlanes();

      // Clear slice children and free resources
      while (this.slicePieceGroup.children.length > 0) {
        const child = this.slicePieceGroup.children[0];
        this.slicePieceGroup.remove(child);
        if (child.userData?.isCandle) continue;
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    }

    this.cutLines.forEach(l => {
      l.visible = false;
      l.material.opacity = 0;
    });

    // Hide interior faces
    this.interiorFaces.forEach(f => { f.visible = false; });

    // Remove clipping from cake model (restore full cake)
    this._removeClipping();

    this.cutCount = 0;
    this.isCutting = false;
    this.isComplete = false;
  }

  // ==========================
  // KNIFE ANIMATIONS
  // ==========================

  /** Float knife down to hover above cake */
  _animateKnifeEntrance() {
    const startY = this.knife.position.y;
    const targetY = this.cakeHeight + this.cakeBaseY + 1.6;
    const startTime = Date.now();
    const duration = 1200;

    const animate = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.knife.position.y = startY + (targetY - startY) * ease;
      this.knife.rotation.z = Math.sin(Date.now() * 0.003) * 0.02;

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  /**
   * Perform one cut action.
   * @returns {Promise} resolves when cut animation finishes
   */
  performCut() {
    if (this.isCutting || this.isComplete) return Promise.resolve();
    this.isCutting = true;
    this.cutCount++;

    if (this.cutCount <= 2) {
      return this._animateCutDown(this.cutCount - 1).then(() => {
        this.isCutting = false;
        if (this.cutCount >= 2) {
          return this._animateSliceSeparation();
        }
      });
    }
    return Promise.resolve();
  }

  /** Animate knife cutting down through the cake */
  _animateCutDown(cutIndex) {
    return new Promise((resolve) => {
      const cutAngle = (cutIndex === 0) ? -this.sliceAngle / 2 : this.sliceAngle / 2;
      const cutX = Math.cos(cutAngle) * this.cakeRadius * 0.5;
      const cutZ = Math.sin(cutAngle) * this.cakeRadius * 0.5;

      const startY = this.cakeHeight + this.cakeBaseY + 1.6;
      const endY = this.cakeBaseY + 0.1;

      const moveStart = Date.now();
      const moveDuration = 400;

      const moveToPosition = () => {
        const t = Math.min((Date.now() - moveStart) / moveDuration, 1);
        const ease = 1 - Math.pow(1 - t, 2);

        this.knife.position.x = cutX * ease;
        this.knife.position.z = cutZ * ease;
        this.knife.rotation.y = -cutAngle * ease;

        if (t < 1) {
          requestAnimationFrame(moveToPosition);
        } else {
          this._cutDown(startY, endY, cutIndex, resolve);
        }
      };
      moveToPosition();
    });
  }

  _cutDown(startY, endY, cutIndex, resolve) {
    const startTime = Date.now();
    const duration = 800;

    if (this.cutLines[cutIndex]) {
      this.cutLines[cutIndex].visible = true;
    }

    const animate = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep

      this.knife.position.y = startY + (endY - startY) * ease;

      if (this.cutLines[cutIndex]) {
        this.cutLines[cutIndex].material.opacity = ease * 0.8;
      }

      this.knife.rotation.z = Math.sin(Date.now() * 0.02) * 0.01 * (1 - t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this._liftKnife().then(resolve);
      }
    };
    animate();
  }

  /** Lift knife back to hover position after a cut */
  _liftKnife() {
    return new Promise((resolve) => {
      const startY = this.knife.position.y;
      const endY = this.cakeHeight + this.cakeBaseY + 1.6;
      const startTime = Date.now();
      const duration = 500;

      const animate = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        this.knife.position.y = startY + (endY - startY) * ease;

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.knife.position.x = 0;
          this.knife.position.z = 0;
          this.knife.rotation.y = 0;
          resolve();
        }
      };
      animate();
    });
  }

  // ==========================
  // SLICE SEPARATION (THE MAIN VISUAL PAYOFF)
  // ==========================

  /** Animate the realistic cake slice separating smoothly from the cake */
  _animateSliceSeparation() {
    return new Promise((resolve) => {
      this.isComplete = true;
      this.knife.visible = false;

      // 1. Clip the wedge from the original cake model
      this._applyClipping();

      // 2. Show the main cake's cut gap interior walls
      this.interiorFaces.forEach(f => { f.visible = true; });

      // 3. Setup the realistic slice piece with the cloned Spider-Man cake model
      this._setupSlicePiece();

      const startTime = Date.now();
      const duration = 1600;

      const midAngle = 0;
      const slideDistance = 2.2;

      const animate = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        const ease = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Slide the piece outward along the wedge center axis
        this.slicePieceGroup.position.x = Math.cos(midAngle) * slideDistance * ease;
        this.slicePieceGroup.position.z = Math.sin(midAngle) * slideDistance * ease;
        // Gentle arc lift
        this.slicePieceGroup.position.y = Math.sin(ease * Math.PI) * 0.35;

        // Synchronize clipping planes with moving piece
        this._updateSliceClippingPlanes();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this._settleWobble().then(resolve);
        }
      };
      animate();
    });
  }

  /** Soft settling wobble when the slice piece lands in front */
  _settleWobble() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const duration = 600;

      const animate = () => {
        const t = Math.min((Date.now() - startTime) / duration, 1);
        const wobble = Math.sin(t * Math.PI * 3) * 0.04 * (1 - t);
        this.slicePieceGroup.rotation.x = wobble;

        this._updateSliceClippingPlanes();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.slicePieceGroup.rotation.x = 0;
          this._updateSliceClippingPlanes();
          resolve();
        }
      };
      animate();
    });
  }

  // ==========================
  // GETTERS
  // ==========================

  get completed() {
    return this.isComplete;
  }

  get cuts() {
    return this.cutCount;
  }
}
