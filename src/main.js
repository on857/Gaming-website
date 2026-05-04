console.log("main.js LOADED");
import * as THREE from 'https://cdn.skypack.dev/three@0.160.0';

window.startGame = function() {
    alert("main.js: startGame() starting...");
    console.log("startGame() executed");
    
    // Clear the whole body to ensure fresh start
    document.body.innerHTML = ""; 
    document.body.style.backgroundColor = "#222";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '999';
    document.body.appendChild(renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    scene.add(cube);

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
    console.log("Diagnostic scene is now animating.");
};

console.log("main.js: startGame exported to window.");
