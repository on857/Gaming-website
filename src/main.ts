import * as THREE from 'three';
import '../styles/style.css';
import { Engine } from './core/Engine';
import { Physics } from './core/Physics';
import { Level } from './world/Level';
import { Lighting } from './world/Lighting';
import { Player } from './player/Player';
import { Input } from './player/Input';
import { Weapon } from './weapons/Weapon';
import { HUD } from './ui/HUD';
import { SoundManager } from './core/SoundManager';
import { Enemy } from './enemies/Enemy';

async function initGame() {
    console.log("Initializing Project Vanguard...");
    
    // Initialize Core
    const engine = new Engine();
    const physics = new Physics();
    const input = new Input();

    // Setup World & HDRI (Non-blocking for stability)
    engine.setHDRI('/assets/textures/citrus_orchard_road_puresky_4k.exr').catch(err => {
        console.warn("HDRI failed, using default lighting", err);
    });
    
    new Lighting(engine.scene);
    new Level(engine.scene, physics, engine.assetManager);

    // Setup Player & Systems
    const player = new Player(engine.scene, engine.camera, physics, input, engine.assetManager);
    const weapon = new Weapon(engine.scene, engine.camera, input, player);
    new HUD();

    // Sound Preloading
    const soundManager = SoundManager.getInstance();
    await Promise.all([
        soundManager.preloadSound('shoot', '/assets/sounds/freesound_community-gunshot-46489.mp3'),
        soundManager.preloadSound('footstep', '/assets/sounds/freesound_community-concrete-footsteps-1-6265.mp3')
    ]).catch(err => console.warn("Some sounds failed to preload", err));

    window.addEventListener('click', () => {
        soundManager.playSound('/assets/sounds/white_records-inception-cinematic-background-music-for-video-stories-31-second-478713.mp3', 0.1);
    }, { once: true });

    // Spawn enemies on street intersections
    const enemies: Enemy[] = [];
    const spawnPoints = [
        new THREE.Vector3(  20, 2,   0),   // East street
        new THREE.Vector3( -20, 2,   0),   // West street
        new THREE.Vector3(   0, 2,  20),   // North street
        new THREE.Vector3(   0, 2, -20),   // South street
        new THREE.Vector3(  20, 2,  40),   // Further north-east
        new THREE.Vector3( -20, 2, -40),   // Further south-west
        new THREE.Vector3(  40, 2,  20),   // Far east
    ];
    spawnPoints.forEach(pos => {
        enemies.push(new Enemy(engine.scene, physics, engine.assetManager, pos, player));
    });

    // Main Loop
    engine.render(() => {
        let deltaTime = engine.clock.getDelta();
        if (deltaTime > 0.1) deltaTime = 0.1; // Prevent physics explosions
        
        const elapsedTime = engine.clock.getElapsedTime();

        physics.update(deltaTime);
        player.update(deltaTime);
        weapon.update(elapsedTime);
        
        enemies.forEach(enemy => enemy.update());
    });
    
    console.log("Project Vanguard Engine Running.");
}

// Export to window for the button click
(window as any).startGame = initGame;
