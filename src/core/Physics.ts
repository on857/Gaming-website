import * as CANNON from 'cannon-es';

export class Physics {
    public world: CANNON.World;

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0); // Standard Earth gravity
        
        // Better performance for simple collisions
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        (this.world.solver as CANNON.GSSolver).iterations = 10;
        this.world.allowSleep = true;
    }

    public update(deltaTime: number) {
        // Use a fixed time step for physics stability
        this.world.step(1 / 60, deltaTime, 3);
    }
}
