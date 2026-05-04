import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

export class AssetManager {
    private gltfLoader: GLTFLoader;
    private rgbeLoader: RGBELoader;
    private exrLoader: EXRLoader;
    private audioLoader: THREE.AudioLoader;
    public assets: { [key: string]: any } = {};

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.rgbeLoader = new RGBELoader();
        this.exrLoader = new EXRLoader();
        this.audioLoader = new THREE.AudioLoader();
    }

    async loadGLB(name: string, url: string): Promise<any> {
        console.log(`Starting GLB load: ${url}`);
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, (gltf) => {
                console.log(`Successfully loaded GLB: ${url}`);
                this.assets[name] = gltf;
                resolve(gltf);
            }, (progress) => {
                const percent = (progress.loaded / progress.total * 100);
                window.dispatchEvent(new CustomEvent('asset-progress', { detail: { name, percent } }));
            }, (err) => {
                console.error(`Failed to load GLB: ${url}`, err);
                reject(err);
            });
        });
    }

    async loadHDRI(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
        console.log(`Starting HDRI load: ${url}`);
        const isEXR = url.toLowerCase().endsWith('.exr');
        const loader = isEXR ? this.exrLoader : this.rgbeLoader;
        
        return new Promise((resolve, reject) => {
            loader.load(url, (texture) => {
                console.log(`Successfully loaded HDRI: ${url}`);
                texture.mapping = THREE.EquirectangularReflectionMapping;
                resolve(texture);
            }, (progress) => {
                const percent = (progress.loaded / progress.total * 100);
                window.dispatchEvent(new CustomEvent('asset-progress', { detail: { name: 'HDRI', percent } }));
            }, (err) => {
                console.error(`Failed to load HDRI: ${url}`, err);
                reject(err);
            });
        });
    }

    async loadAudio(name: string, url: string): Promise<AudioBuffer> {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url, (buffer) => {
                this.assets[name] = buffer;
                resolve(buffer);
            }, undefined, reject);
        });
    }
}
