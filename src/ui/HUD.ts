export class HUD {
    private container: HTMLDivElement;
    private ammoDisplay: HTMLDivElement;
    private healthDisplay: HTMLDivElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.bottom = '20px';
        this.container.style.right = '20px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Orbitron, sans-serif';
        this.container.style.fontSize = '24px';
        this.container.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.7)';
        this.container.style.pointerEvents = 'none';

        this.ammoDisplay = document.createElement('div');
        this.ammoDisplay.innerText = 'AMMO: 30 / 30';
        this.container.appendChild(this.ammoDisplay);

        this.healthDisplay = document.createElement('div');
        this.healthDisplay.style.position = 'fixed';
        this.healthDisplay.style.bottom = '20px';
        this.healthDisplay.style.left = '20px';
        this.healthDisplay.innerText = 'HEALTH: 100';
        this.container.appendChild(this.healthDisplay);

        this.createCrosshair();
        document.body.appendChild(this.container);

        window.addEventListener('weapon-fired', (e: any) => {
            this.ammoDisplay.innerText = `AMMO: ${e.detail.ammo} / 30`;
        });
    }

    private createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.style.position = 'fixed';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.width = '10px';
        crosshair.style.height = '10px';
        crosshair.style.border = '2px solid cyan';
        crosshair.style.borderRadius = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.pointerEvents = 'none';
        document.body.appendChild(crosshair);
    }
}
