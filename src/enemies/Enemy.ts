import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../core/Physics';
import { AssetManager } from '../core/AssetManager';
import { SoundManager } from '../core/SoundManager';

export class Enemy {
    public body: CANNON.Body;
    public mesh: THREE.Group | null = null;

    // Invisible hitbox — always in scene, always raycasted
    private hitbox: THREE.Mesh;

    private health: number = 100;
    private isDead: boolean = false;

    // Shooting
    private lastShootTime: number = 0;
    private readonly SHOOT_INTERVAL = 2000; // ms between shots

    constructor(
        private scene: THREE.Scene,
        private physics: Physics,
        private assetManager: AssetManager,
        private spawnPos: THREE.Vector3,
        private player: any
    ) {
        this.createBody();
        this.createHitbox();
        this.loadModel();
    }

    // ── Physics body ──────────────────────────────────────────────────────────

    private createBody() {
        this.body = new CANNON.Body({
            mass: 60,
            shape: new CANNON.Box(new CANNON.Vec3(0.4, 1.0, 0.4)),
            position: new CANNON.Vec3(this.spawnPos.x, this.spawnPos.y + 1, this.spawnPos.z),
            fixedRotation: true,
            linearDamping: 0.9,
        });
        this.physics.world.addBody(this.body);
    }

    // ── Invisible hitbox (guaranteed raycast surface) ─────────────────────────

    private createHitbox() {
        this.hitbox = new THREE.Mesh(
            new THREE.BoxGeometry(1, 2, 1),
            new THREE.MeshBasicMaterial({ visible: false, depthWrite: false })
        );
        // Tag hitbox so Weapon.findEnemy() works
        this.hitbox.userData.enemy = this;
        this.hitbox.name = 'EnemyHitbox';
        this.hitbox.position.copy(this.spawnPos);
        this.scene.add(this.hitbox);
    }

    // ── Load 3D model ─────────────────────────────────────────────────────────

    private async loadModel() {
        try {
            const gltf = await this.assetManager.loadGLB(
                'enemy',
                'assets/models/dark_faceless_black_assassin.glb'
            );
            this.mesh = gltf.scene.clone();
            this.mesh.name = 'EnemyMesh';
            this.mesh.scale.set(0.55, 0.55, 0.55);

            // Tag EVERY child so raycasts on child meshes also resolve the enemy
            this.mesh.userData.enemy = this;
            this.mesh.traverse((child: any) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.userData.enemy = this;
                    child.userData.origMat  = child.material;
                }
            });

            this.scene.add(this.mesh);
        } catch (e) {
            // Fallback: bright red capsule so you can still see / shoot it
            console.warn('[Enemy] Model load failed, using capsule fallback');
            const capsule = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1.0, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0xcc2200 })
            );
            capsule.userData.enemy = this;
            this.mesh = new THREE.Group();
            this.mesh.userData.enemy = this;
            this.mesh.add(capsule);
            this.scene.add(this.mesh);
        }
    }

    // ── Per-frame update ──────────────────────────────────────────────────────

    public update() {
        if (this.isDead) return;

        // Sync hitbox with physics
        this.hitbox.position.set(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );

        // Sync visual mesh (feet at ground level)
        if (this.mesh) {
            this.mesh.position.set(
                this.body.position.x,
                this.body.position.y - 1.0,
                this.body.position.z
            );
        }

        // Need player mesh to navigate
        const target = this.player.mesh;
        if (!target) return;

        const myPos = new THREE.Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
        const dist = myPos.distanceTo(target.position);

        // ── Always move toward player until close ─────────────────────────────
        const dir = new THREE.Vector3()
            .subVectors(target.position, myPos)
            .normalize();

        const SPEED = 3.5;
        const STOP_DIST = 4; // stop when this close

        if (dist > STOP_DIST) {
            this.body.velocity.x = dir.x * SPEED;
            this.body.velocity.z = dir.z * SPEED;
        } else {
            this.body.velocity.x *= 0.7;
            this.body.velocity.z *= 0.7;
        }

        // Face the player
        if (this.mesh) {
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // ── Shoot when in range ───────────────────────────────────────────────
        if (dist < 15) {
            const now = Date.now();
            if (now - this.lastShootTime > this.SHOOT_INTERVAL) {
                this.shoot();
                this.lastShootTime = now;
            }
        }
    }

    // ── Enemy fires at player ─────────────────────────────────────────────────

    private shoot() {
        const muzzle = this.hitbox.position.clone().add(new THREE.Vector3(0, 0.8, 0));
        const playerEye = this.player.camera
            ? this.player.camera.position.clone()
            : this.player.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0));

        // Red tracer
        const geo = new THREE.BufferGeometry().setFromPoints([muzzle, playerEye]);
        const mat = new THREE.LineBasicMaterial({ color: 0xff2200 });
        const tracer = new THREE.Line(geo, mat);
        this.scene.add(tracer);
        setTimeout(() => this.scene.remove(tracer), 60);

        // 35% chance to hit
        if (Math.random() < 0.35 && this.player.takeDamage) {
            this.player.takeDamage(8);
        }
    }

    // ── Take damage (called by Weapon.ts) ────────────────────────────────────

    public takeDamage(amount: number) {
        if (this.isDead) return;

        this.health -= amount;
        console.log(`[ENEMY] Hit! HP: ${this.health}`);

        // Flash red
        if (this.mesh) {
            this.mesh.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                }
            });
            setTimeout(() => {
                if (!this.mesh) return;
                this.mesh.traverse((child: any) => {
                    if (child.isMesh && child.userData.origMat) {
                        child.material = child.userData.origMat;
                    }
                });
            }, 80);
        }

        SoundManager.getInstance().playHitSound();

        if (this.health <= 0) this.die();
    }

    // ── Die — instant removal ─────────────────────────────────────────────────

    private die() {
        this.isDead = true;
        console.log('[ENEMY] Killed!');

        // Remove hitbox from scene immediately
        this.scene.remove(this.hitbox);

        // Remove physics body
        try { this.physics.world.removeBody(this.body); } catch (_) {}

        // Remove visual mesh immediately
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}
