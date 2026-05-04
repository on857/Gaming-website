import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../core/Physics';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { AssetManager } from '../core/AssetManager';

export class Level {
    constructor(
        private scene: THREE.Scene,
        private physics: Physics,
        private assetManager: AssetManager
    ) {
        this.buildCity();
        this.createSky();
    }

    // ─── MAIN CITY BUILDER ───────────────────────────────────────────────────

    private buildCity() {
        this.createGround();
        this.createRoads();
        this.createBuildings();
        this.createStreetLights();
        this.createProps();
    }

    // ─── GROUND ──────────────────────────────────────────────────────────────

    private createGround() {
        // Physics plane
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physics.world.addBody(groundBody);

        // Asphalt texture
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 256, 256);
        // Subtle noise
        for (let i = 0; i < 3000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const v = Math.floor(Math.random() * 15 + 30);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 2, 2);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(60, 60);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(600, 600),
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'Ground';
        this.scene.add(ground);
    }

    // ─── ROADS ───────────────────────────────────────────────────────────────

    private createRoads() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
        const lineMat = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.8 });
        const ROAD_W = 10;
        const BLOCK_SIZE = 40;

        // Grid of roads: -3 to +3 blocks in both axes
        for (let i = -3; i <= 3; i++) {
            const offset = i * BLOCK_SIZE;

            // East-West road
            const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(260, ROAD_W), roadMat);
            ewRoad.rotation.x = -Math.PI / 2;
            ewRoad.position.set(0, 0.01, offset);
            ewRoad.receiveShadow = true;
            this.scene.add(ewRoad);

            // North-South road
            const nsRoad = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 260), roadMat);
            nsRoad.rotation.x = -Math.PI / 2;
            nsRoad.position.set(offset, 0.01, 0);
            nsRoad.receiveShadow = true;
            this.scene.add(nsRoad);

            // Center dashed line EW
            for (let d = -130; d < 130; d += 6) {
                const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.2), lineMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(d, 0.02, offset);
                this.scene.add(dash);
            }
            // Center dashed line NS
            for (let d = -130; d < 130; d += 6) {
                const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3), lineMat);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(offset, 0.02, d);
                this.scene.add(dash);
            }
        }
    }

    // ─── BUILDINGS ───────────────────────────────────────────────────────────

    private createBuildings() {
        const BLOCK_SIZE = 40;
        const ROAD_W = 10;
        const MARGIN = 1;

        // Building colour palette — realistic urban greys/browns
        const palettes = [
            0x4a4a5a, 0x5a5a6a, 0x3e3e4e,
            0x5c4f3d, 0x6b5d4f, 0x4a3f35,
            0x2d4a6b, 0x3a5f7a, 0x2a3f55,
            0x3d3d3d, 0x505050, 0x626262,
        ];

        // Iterate over every city block in the grid
        for (let gx = -3; gx < 3; gx++) {
            for (let gz = -3; gz < 3; gz++) {
                // Block centre
                const blockCX = gx * BLOCK_SIZE + BLOCK_SIZE / 2;
                const blockCZ = gz * BLOCK_SIZE + BLOCK_SIZE / 2;

                // Available block area (minus road + margin)
                const avail = BLOCK_SIZE - ROAD_W - MARGIN * 2;

                // Split each block into 1-4 buildings randomly
                const cols = Math.random() < 0.4 ? 2 : 1;
                const rows = Math.random() < 0.4 ? 2 : 1;

                for (let bx = 0; bx < cols; bx++) {
                    for (let bz = 0; bz < rows; bz++) {
                        const bW = (avail / cols) - 1;
                        const bD = (avail / rows) - 1;
                        const bH = 8 + Math.random() * 32; // 8–40m tall

                        const cx = blockCX - avail / 2 + bW / 2 + bx * (avail / cols);
                        const cz = blockCZ - avail / 2 + bD / 2 + bz * (avail / rows);

                        const color = palettes[Math.floor(Math.random() * palettes.length)];
                        this.spawnBuilding(cx, bH, cz, bW, bH, bD, color);
                    }
                }
            }
        }
    }

    private spawnBuilding(cx: number, cy: number, cz: number, w: number, h: number, d: number, color: number) {
        // Main body
        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.85,
            metalness: 0.05,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(cx, h / 2, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Window grid texture on top face (simple emissive strips)
        const winRows = Math.floor(h / 3);
        const winCols = Math.floor(w / 2);
        for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
                if (Math.random() < 0.6) { // 60% windows lit
                    const win = new THREE.Mesh(
                        new THREE.PlaneGeometry(0.8, 1.2),
                        new THREE.MeshBasicMaterial({ color: 0xffffcc })
                    );
                    win.position.set(
                        cx - w / 2 + 1 + c * 2,
                        h / 2 - h + 2 + r * 3,
                        cz + d / 2 + 0.01
                    );
                    this.scene.add(win);
                }
            }
        }

        // Rooftop ledge
        const ledge = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4),
            new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        ledge.position.set(cx, h + 0.15, cz);
        this.scene.add(ledge);

        // Physics collider
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
        body.position.set(cx, h / 2, cz);
        this.physics.world.addBody(body);
    }

    // ─── STREET LIGHTS ───────────────────────────────────────────────────────

    private createStreetLights() {
        const BLOCK_SIZE = 40;
        const ROAD_HALF = 6;

        for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
                const x = i * BLOCK_SIZE;
                const z = j * BLOCK_SIZE;
                this.spawnStreetLight(x + ROAD_HALF, z + ROAD_HALF);
                this.spawnStreetLight(x - ROAD_HALF, z - ROAD_HALF);
            }
        }
    }

    private spawnStreetLight(x: number, z: number) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6 });

        // Pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 6), poleMat);
        pole.position.set(x, 3, z);
        pole.castShadow = true;
        this.scene.add(pole);

        // Arm
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(x + 1, 6.1, z);
        this.scene.add(arm);

        // Lamp head
        const lamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.2, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffffaa })
        );
        lamp.position.set(x + 2, 6, z);
        this.scene.add(lamp);

        // Point light
        const light = new THREE.PointLight(0xffee88, 0.8, 20);
        light.position.set(x + 2, 5.8, z);
        this.scene.add(light);
    }

    // ─── PROPS (crates, barriers) ────────────────────────────────────────────

    private createProps() {
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.9 });
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0xcc3300, roughness: 0.8 });

        const propPositions = [
            { x: 12, z: 5 }, { x: -12, z: 5 }, { x: 5, z: 12 }, { x: -5, z: -12 },
            { x: 18, z: -5 }, { x: -18, z: 8 }, { x: 8, z: -18 }, { x: -8, z: 18 },
            { x: 22, z: 22 }, { x: -22, z: 22 }, { x: 22, z: -22 }, { x: -22, z: -22 },
        ];

        propPositions.forEach(({ x, z }) => {
            // Wooden crate
            const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), crateMat);
            crate.position.set(x, 0.6, z);
            crate.castShadow = true;
            crate.receiveShadow = true;
            this.scene.add(crate);

            const crateBody = new CANNON.Body({ mass: 0 });
            crateBody.addShape(new CANNON.Box(new CANNON.Vec3(0.6, 0.6, 0.6)));
            crateBody.position.set(x, 0.6, z);
            this.physics.world.addBody(crateBody);

            // Barrier
            if (Math.random() > 0.5) {
                const barrier = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.4), barrierMat);
                barrier.position.set(x + 2, 0.5, z);
                barrier.castShadow = true;
                this.scene.add(barrier);

                const barrierBody = new CANNON.Body({ mass: 0 });
                barrierBody.addShape(new CANNON.Box(new CANNON.Vec3(1, 0.5, 0.2)));
                barrierBody.position.set(x + 2, 0.5, z);
                this.physics.world.addBody(barrierBody);
            }
        });
    }

    // ─── SKY ─────────────────────────────────────────────────────────────────

    private createSky() {
        const sky = new Sky();
        sky.scale.setScalar(450000);
        this.scene.add(sky);

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = 5;
        uniforms['rayleigh'].value = 1.5;
        uniforms['mieCoefficient'].value = 0.004;
        uniforms['mieDirectionalG'].value = 0.85;

        const sun = new THREE.Vector3();
        sun.setFromSphericalCoords(1, THREE.MathUtils.degToRad(35), THREE.MathUtils.degToRad(180));
        uniforms['sunPosition'].value.copy(sun);
    }
}
