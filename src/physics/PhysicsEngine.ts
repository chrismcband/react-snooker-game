import Matter from 'matter-js';

export class PhysicsEngine {
  private engine: Matter.Engine;
  private runner: Matter.Runner;
  private render: Matter.Render | null = null;

  constructor(element?: HTMLElement) {
    // Create physics engine
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = 0; // No gravity for snooker (top-down view)
    
    // Create runner for continuous physics simulation
    this.runner = Matter.Runner.create();
    
    // Optional: Create renderer for debugging (can be disabled in production)
    if (element && process.env.NODE_ENV === 'development') {
      this.render = Matter.Render.create({
        element,
        engine: this.engine,
        options: {
          width: 840,
          height: 440,
          wireframes: true,
          showVelocity: true,
        },
      });
    }
  }

  public start(): void {
    Matter.Runner.run(this.runner, this.engine);
    if (this.render) {
      Matter.Render.run(this.render);
    }
  }

  public stop(): void {
    Matter.Runner.stop(this.runner);
    if (this.render) {
      Matter.Render.stop(this.render);
    }
  }

  public update(delta: number): void {
    Matter.Engine.update(this.engine, delta);
  }

  public addBody(body: Matter.Body): void {
    Matter.World.add(this.engine.world, body);
  }

  public removeBody(body: Matter.Body): void {
    Matter.World.remove(this.engine.world, body);
  }

  public createBall(x: number, y: number, radius: number, restitution: number = 0.95): Matter.Body {
    return Matter.Bodies.circle(x, y, radius, {
      restitution,
      friction: 0.01,
      frictionAir: 0.01,
      density: 0.001,
    });
  }

  public applyForce(body: Matter.Body, force: Matter.Vector): void {
    Matter.Body.applyForce(body, body.position, force);
  }

  public setVelocity(body: Matter.Body, velocity: Matter.Vector): void {
    Matter.Body.setVelocity(body, velocity);
  }

  public getEngine(): Matter.Engine {
    return this.engine;
  }

  public onCollision(callback: (event: Matter.IEventCollision<Matter.Engine>) => void): void {
    Matter.Events.on(this.engine, 'collisionStart', callback);
  }

  public destroy(): void {
    this.stop();
    if (this.render) {
      Matter.Render.world(this.render);
    }
    Matter.Engine.clear(this.engine);
  }
}