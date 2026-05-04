import * as THREE from 'three';
import { Input } from '../player/Input';
import { Player } from '../player/Player';
import { SoundManager } from '../core/SoundManager';

export class Weapon {
    private soundManager: SoundManager;
    private raycaster: THREE.Raycaster;
    private muzzleFlash: THREE.PointLight;

    // Fire rate
    private readonly FIRE_RATE = 0.18;       // seconds (semi-auto feel)
    private lastFireTime: number = 0;

    // Ammo
    private ammo: number = 30;
    private readonly MAX_AMMO = 30;

    // ADS
    private isADS: boolean = false;
    private readonly FOV_DEFAULT = 75;
    private readonly FOV_ADS = 25;           // tight sniper zoom
    private readonly ADS_LERP = 0.12;

    constructor(
        private scene: THREE.Scene,
        private camera: THREE.PerspectiveCamera,
        private input: Input,
        private player: Player
    ) {
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 500;             // long-range shots
        this.soundManager = SoundManager.getInstance();

        // Muzzle flash light
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 8);
        this.scene.add(this.muzzleFlash);
    }

    // ─── Per-frame update ────────────────────────────────────────────────────

    public update(elapsedTime: number) {
        // Fire on left click
        if (this.input.mouse.left && elapsedTime - this.lastFireTime > this.FIRE_RATE) {
            this.fire(elapsedTime);
        }

        // ADS toggle
        if (this.input.mouse.right) {
            if (!this.isADS) {
                this.isADS = true;
                window.dispatchEvent(new CustomEvent('ads-toggle', { detail: { active: true } }));
            }
        } else {
            if (this.isADS) {
                this.isADS = false;
                window.dispatchEvent(new CustomEvent('ads-toggle', { detail: { active: false } }));
            }
        }

        // Smooth FOV lerp
        const targetFOV = this.isADS ? this.FOV_ADS : this.FOV_DEFAULT;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, this.ADS_LERP);
        this.camera.updateProjectionMatrix();

        // Move muzzle flash with camera
        if (this.muzzleFlash.intensity > 0) {
            const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            this.muzzleFlash.position.copy(this.camera.position).addScaledVector(fwd, 0.6);
        }
    }

    // ─── Firing logic ────────────────────────────────────────────────────────

    private fire(elapsedTime: number) {
        if (this.ammo <= 0) {
            console.log('[WEAPON] Out of ammo – reloading placeholder');
            this.ammo = this.MAX_AMMO;
            return;
        }
        this.ammo--;
        this.lastFireTime = elapsedTime;

        this.soundManager.playShootSound();

        // Muzzle flash
        this.muzzleFlash.intensity = 8;
        setTimeout(() => { this.muzzleFlash.intensity = 0; }, 55);

        // Camera recoil
        const recoil = this.isADS ? 0.008 : 0.025;
        this.player.pitch += recoil;
        this.player.yaw += (Math.random() - 0.5) * recoil * 0.5;

        // ── Raycast ────────────────────────────────────────────────────────
        // Always from screen center → precision shot
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // We want to intersect EVERYTHING except the player's own mesh
        const candidates = this.scene.children.filter(c => c !== this.player.mesh);
        const hits = this.raycaster.intersectObjects(candidates, true);

        if (hits.length > 0) {
            const hit = hits[0];

            // Walk up the parent chain to find the Enemy reference
            const enemy = this.findEnemy(hit.object);
            if (enemy) {
                console.log('[WEAPON] Hit enemy!');
                enemy.takeDamage(25);
                this.showHitmarker();
            }

            // Bullet trail: camera → impact point
            this.spawnBulletTrail(this.camera.position, hit.point);

            // Impact sparks
            this.spawnImpact(hit.point, hit.face?.normal ?? new THREE.Vector3(0, 1, 0));

            this.soundManager.playImpactSound();
        }

        window.dispatchEvent(new CustomEvent('weapon-fired', { detail: { ammo: this.ammo } }));
    }

    // Walk up the object tree until we find userData.enemy (set on every child in Enemy.ts)
    private findEnemy(obj: THREE.Object3D | null): any {
        while (obj) {
            if (obj.userData && obj.userData.enemy) {
                return obj.userData.enemy;
            }
            obj = obj.parent;
        }
        return null;
    }

    // ─── Visuals ─────────────────────────────────────────────────────────────

    private showHitmarker() {
        const el = document.getElementById('hitmarker');
        if (!el) return;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 120);
    }

    private spawnBulletTrail(from: THREE.Vector3, to: THREE.Vector3) {
        const points = [from.clone(), to.clone()];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.6 });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);
        setTimeout(() => this.scene.remove(line), 60);
    }

    private spawnImpact(point: THREE.Vector3, normal: THREE.Vector3) {
        const SPARK_COUNT = 6;
        for (let i = 0; i < SPARK_COUNT; i++) {
            const geo = new THREE.BoxGeometry(0.025, 0.025, 0.025);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
            const spark = new THREE.Mesh(geo, mat);
            spark.position.copy(point);

            const vel = normal.clone().add(
                new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)
            ).normalize().multiplyScalar(0.08 + Math.random() * 0.06);

            this.scene.add(spark);
            const t0 = Date.now();
            const animate = () => {
                if (Date.now() - t0 > 450) { this.scene.remove(spark); return; }
                spark.position.addScaledVector(vel, 1);
                vel.y -= 0.006;
                requestAnimationFrame(animate);
            };
            animate();
        }

        // Tiny bullet-hole decal
        const holeGeo = new THREE.PlaneGeometry(0.06, 0.06);
        const holeMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.copy(point).addScaledVector(normal, 0.002);
        hole.lookAt(point.clone().add(normal));
        this.scene.add(hole);
        setTimeout(() => this.scene.remove(hole), 6000);
    }
}
