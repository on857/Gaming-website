import * as THREE from 'three';

export class Lighting {
    constructor(private scene: THREE.Scene) {
        this.init();
    }

    private init() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        const hemiLight = new THREE.HemisphereLight(0xc9e8ff, 0x334422, 0.3);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const directionalLight = new THREE.DirectionalLight(0xfff0dd, 0.6);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.bias = -0.0005;
        
        this.scene.add(directionalLight);
    }
}
