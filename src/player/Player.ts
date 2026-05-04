import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../core/Physics';
import { Input } from './Input';
import { AssetManager } from '../core/AssetManager';
import { SoundManager } from '../core/SoundManager';

export class Player {
    public body: CANNON.Body;
    public mesh: THREE.Group;
    public readonly camera: THREE.PerspectiveCamera;  // public so Enemy can read it
    private weaponMesh: THREE.Group;
    private moveSpeed = 5;
    private jumpForce = 5;
    private canJump = false;
    private health = 100;
    private isDead = false;

    // Rotation properties
    public pitch = 0;
    public yaw = 0;

    constructor(
        private scene: THREE.Scene,
        camera: THREE.PerspectiveCamera,
        private physics: Physics,
        private input: Input,
        private assetManager: AssetManager
    ) {
        this.camera = camera;   // store to the public field
        this.createBody();
        this.init();
    }

    private async init() {
        await this.loadModels();
        this.initControls();
    }

    private async loadModels() {
        // Character Model
        const charGltf = await this.assetManager.loadGLB('player', 'assets/models/a_solider_poin_weapon.glb');
        this.mesh = charGltf.scene;
        this.mesh.name = 'Player';  // used by Enemy LOS check
        this.mesh.traverse((child: any) => { if (child.isMesh) { child.castShadow = true; child.name = 'Player'; } });
        this.mesh.scale.set(0.5, 0.5, 0.5); // Adjust scale
        this.scene.add(this.mesh);

        // Weapon Model
        const weaponGltf = await this.assetManager.loadGLB('weapon', 'assets/models/pistol__desert_eagle_weapon_model_cs2.glb');
        this.weaponMesh = weaponGltf.scene;
        this.weaponMesh.scale.set(0.1, 0.1, 0.1);
        this.scene.add(this.weaponMesh);
    }

    private createBody() {
        const shape = new CANNON.Sphere(0.5);
        this.body = new CANNON.Body({
            mass: 70,
            shape: shape,
            position: new CANNON.Vec3(0, 5, 0),
            fixedRotation: true,
            linearDamping: 0.9, // Friction/Air resistance
        });
        
        // Ground detection
        this.body.addEventListener('collide', (e: any) => {
            const contact = e.contact;
            // Check if collision is roughly from below
            if (contact.ni.dot(new CANNON.Vec3(0, 1, 0)) > 0.5) {
                this.canJump = true;
            }
        });

        this.physics.world.addBody(this.body);
    }

    private initControls() {
        document.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                let sens = 0.002;
                if (this.input.mouse.right) sens = 0.0005; // Lower sensitivity for sniper precision
                
                this.yaw -= e.movementX * sens;
                this.pitch -= e.movementY * sens;
                this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
            }
        });
    }

    public update(deltaTime: number) {
        if (!this.mesh) {
            this.handleMovement(deltaTime);
            this.updateCamera();
            return;
        }

        // Sync Mesh with Body
        this.mesh.position.copy(this.body.position as any);
        this.mesh.position.y -= 0.5; // Offset to feet
        this.mesh.quaternion.setFromEuler(0, this.yaw, 0);

        // Fall detection
        if (this.body.position.y < -20) {
            this.takeDamage(100); // Game over if you fall off the world
        }

        // Update Movement
        this.handleMovement(deltaTime);

        // Update Camera
        this.updateCamera();
    }

    private footstepTimer = 0;
    private soundManagerInstance = SoundManager.getInstance();

    private bobbingTimer = 0;
    private handleMovement(deltaTime: number) {
        const direction = new THREE.Vector3();

        let isMoving = false;
        if (this.input.isMoveForward())  { direction.z -= 1; isMoving = true; }
        if (this.input.isMoveBackward()) { direction.z += 1; isMoving = true; }
        if (this.input.isMoveLeft())     { direction.x -= 1; isMoving = true; }
        if (this.input.isMoveRight())    { direction.x += 1; isMoving = true; }

        if (isMoving) {
            this.footstepTimer += deltaTime * 2;
            if (this.footstepTimer > 1) {
                this.soundManagerInstance.playFootstepSound();
                this.footstepTimer = 0;
            }
            this.bobbingTimer += deltaTime * 10;
        } else {
            this.bobbingTimer += deltaTime * 2; // slow idle bob
        }

        direction.normalize();
        direction.applyEuler(new THREE.Euler(0, this.yaw, 0));

        // Use velocity instead of force for "easy" movement
        const currentY = this.body.velocity.y;
        this.body.velocity.x = direction.x * this.moveSpeed;
        this.body.velocity.z = direction.z * this.moveSpeed;
        this.body.velocity.y = currentY;

        if (this.input.isPressed('Space') && this.canJump) {
            this.body.velocity.y = this.jumpForce;
            this.canJump = false;
        }
    }

    private isFirstPerson = true;

    private updateCamera() {
        if (!this.mesh) return;

        if (this.input.isPressed('KeyV')) {
            if (!(this as any).vPressed) {
                this.isFirstPerson = !this.isFirstPerson;
                (this as any).vPressed = true;
                setTimeout(() => (this as any).vPressed = false, 200);
            }
        }

        if (this.isFirstPerson) {
            this.mesh.visible = false;
            if (this.weaponMesh) {
                this.weaponMesh.visible = true;
                
                // Position weapon in front of camera with bobbing
                const bobX = Math.sin(this.bobbingTimer * 0.5) * 0.02;
                const bobY = Math.cos(this.bobbingTimer) * 0.02;
                
                const weaponOffset = new THREE.Vector3(0.2 + bobX, -0.2 + bobY, -0.5);
                
                // Sniper ADS offset
                if ((this.input as any).mouse?.right) {
                    weaponOffset.set(0, -0.15, -0.3); // center gun
                }

                weaponOffset.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0));
                this.weaponMesh.position.copy(this.camera.position);
                this.weaponMesh.position.add(weaponOffset);
                this.weaponMesh.quaternion.setFromEuler(this.pitch, this.yaw + Math.PI, 0);
            }

            this.camera.position.copy(this.mesh.position as any);
            this.camera.position.y += 0.8;
            
            const target = new THREE.Vector3(0, 0, -1);
            target.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0));
            target.add(this.camera.position);
            this.camera.lookAt(target);
        } else {
            this.mesh.visible = true;
            if (this.weaponMesh) this.weaponMesh.visible = false;

            const offset = new THREE.Vector3(0, 2, 5);
            offset.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0));
            
            this.camera.position.copy(this.mesh.position as any);
            this.camera.position.add(offset);
            this.camera.lookAt(this.mesh.position);
        }
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        this.health -= amount;
        console.log(`Player health: ${this.health}`);
        
        // Red flash effect
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999';
        document.body.appendChild(overlay);
        setTimeout(() => document.body.removeChild(overlay), 100);

        if (this.health <= 0) {
            this.isDead = true;
            alert("GAME OVER! Refresh to restart.");
            window.location.reload();
        }
        
        window.dispatchEvent(new CustomEvent('player-health', { detail: { health: this.health } }));
    }
}
