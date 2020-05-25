/**
 * @author evanrocha https://github.com/EvanRocha
 */
import * as THREE from "./node_modules/three/build/three.module.js";
import {
	WEBGL
} from './node_modules/three/examples/jsm/WebGL.js';
import {
	OrbitControls
} from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import {
	Sky
} from './node_modules/three/examples/jsm/objects/Sky.js';

const PARTICLES_COUNT = 1000;
const PARTICLE_SCALE = 1;
const PARTICLE_INITIAL_POSITION_RANGE = 1;

// Movement
const PARTICLE_INITIAL_VELOCITY = 0.41;
const PARTICLE_MAX_VELOCITY = 0.405;
const PARTICLE_TURN_ACCELERATION = 0.038;

// Social
const PARTICLE_VISUAL_RANGE = 2;
const SOCIAL_ATTRACTION_FACTOR = 0.1;
const SOCIAL_COHESION_FACTOR = 0.3;
const SOCIAL_DISTANCING_FACTOR = 0.1;
const MINIMUM_SOCIAL_DISTANCE = 1.25;

// Boundaries
const X_BOUNDARY = 14;
const Y_BOUNDARY = 10;
const Z_BOUNDARY = 10;

// Camera
const CAMERA_FIELD_OF_VIEW = 75;
const CAMERA_MAX_POSITION = 100;
const CAMERA_INITIAL_POSITION = 65;

// Sun
const SUN_INITIAL_INCILNATION = 0.511;
const SUN_TARGET_INCLINATION = 0.475;
const SUN_INCLINATION_SPEED = 0.00002;

let scene = null;
let renderer = null;
let camera = null;
let cameraControls = null;
let cameraBoundarySphere = null;
let particleSystemGeometry = null;

let sky = null;
let sunSphere = null;
let sunConfig = {
	turbidity: 10,
	rayleigh: 2,
	mieCoefficient: 0.005,
	mieDirectionalG: 0.8,
	luminance: 1,
	inclination: SUN_INITIAL_INCILNATION,
	targetInclination: SUN_TARGET_INCLINATION,
	azimuth: 0.25, // Facing front,
	distance: 40000,
};



// init Vectorsto avoid object creation in animation loop 
let inPlaceVector = new THREE.Vector3();
let inPlaceSocialDistancingParticleVector = new THREE.Vector3();

function init() {
	initRenderer();
	initScene();
	initCamera();
	initSkyBox();
	initParticles();

	window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
}

function animate() {
	particleSystemGeometry.vertices.map(particle => {
		// Update particle velocity
		// NOTE: Its currently updating all the velocities in place
		// which creates a bit of a bug where particles are updating based off
		// new velocities. Ideally would all operate on previous frame velocities
		updateVelocityForSocialAttraction(particle);
		updateVelocityForSocialDistancing(particle);
		updateVelocityForSocialCohesion(particle);
		updateVelocityForVelocityLimit(particle);
		updateVelocityForPositionBoundary(particle);

		// Update particle position from velocity
		particle.add(particle.velocity);
	});

	particleSystemGeometry.verticesNeedUpdate = true;

	// update camera
	cameraControls.update();
	updatePositionForBoundary(camera);

	updateSunPosition();

	// render
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
};

function initRenderer() {
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById("canvas").appendChild(renderer.domElement);
}

function initScene() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0f0f0f);
}

function initCamera() {
	camera = new THREE.PerspectiveCamera(
		CAMERA_FIELD_OF_VIEW,
		window.innerWidth / window.innerHeight,
		0.1,
		1000,
	);
	camera.position.z = CAMERA_INITIAL_POSITION;

	// Sphere to bound the particles
	cameraBoundarySphere = new THREE.Sphere(new THREE.Vector3(), CAMERA_MAX_POSITION);

	cameraControls = new OrbitControls(camera, renderer.domElement);
	cameraControls.update();
}

function initSkyBox() {
	sky = new Sky();
	sky.scale.setScalar(1000);
	scene.add(sky);

	sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry(20000, 16, 8),
		new THREE.MeshBasicMaterial({
			color: 0xffffff
		})
	);
	scene.add(sunSphere);

	var uniforms = sky.material.uniforms;
	uniforms["turbidity"].value = sunConfig.turbidity;
	uniforms["rayleigh"].value = sunConfig.rayleigh;
	uniforms["mieCoefficient"].value = sunConfig.mieCoefficient;
	uniforms["mieDirectionalG"].value = sunConfig.mieDirectionalG;
	uniforms["luminance"].value = sunConfig.luminance;

	updateSunPosition();
}

function initParticles() {
	particleSystemGeometry = new THREE.Geometry();
	let particleMaterial = new THREE.PointsMaterial({
		color: 0x000000,
		size: PARTICLE_SCALE,
		map: new THREE.TextureLoader().load('../textures/sprites/softcircle.png'),
		sizeAttenuation: true,
		alphaTest: 0.5,
		transparent: true,
	});

	// now create the individual particles
	for (var p = 0; p < PARTICLES_COUNT; p++) {
		const particle = new THREE.Vector3(
			Math.random() * 2 * PARTICLE_INITIAL_POSITION_RANGE - PARTICLE_INITIAL_POSITION_RANGE,
			Math.random() * 2 * PARTICLE_INITIAL_POSITION_RANGE - PARTICLE_INITIAL_POSITION_RANGE,
			Math.random() * 2 * PARTICLE_INITIAL_POSITION_RANGE - PARTICLE_INITIAL_POSITION_RANGE,
		);

		// create a velocity vector. Hackily add it to the particle object
		particle.velocity = new THREE.Vector3(
			Math.random() * 2 * PARTICLE_INITIAL_VELOCITY - PARTICLE_INITIAL_VELOCITY,
			Math.random() * 2 * PARTICLE_INITIAL_VELOCITY - PARTICLE_INITIAL_VELOCITY,
			Math.random() * 2 * PARTICLE_INITIAL_VELOCITY - PARTICLE_INITIAL_VELOCITY,
		);

		particleSystemGeometry.vertices.push(particle);
	}

	let particleSystem = new THREE.Points(
		particleSystemGeometry,
		particleMaterial
	);

	scene.add(particleSystem);
}

// Adjusts velocity of particle towards center of other particles in its visual range
function updateVelocityForSocialAttraction(particle) {
	let visualCenter = inPlaceVector;
	resetVector(visualCenter);
	let numNeighbors = 0;

	for (let otherParticle of particleSystemGeometry.vertices) {
		if (particle.distanceTo(otherParticle) < PARTICLE_VISUAL_RANGE) {
			visualCenter.add(otherParticle);
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		visualCenter.divideScalar(numNeighbors);
		particle.velocity.add(visualCenter
			.sub(particle)
			.multiplyScalar(SOCIAL_ATTRACTION_FACTOR)
		);
	}
}

// Adjusts velocity of particle away from other particles that are too close
function updateVelocityForSocialDistancing(particle) {

	// NOTE: Was running into performance issues using the THREE Vector math functions 
	// Using raw math here instead. Left old code below.
	let moveX = 0;
	let moveY = 0;
	let moveZ = 0;
	for (let otherVertice of particleSystemGeometry.vertices) {
		if (otherVertice !== particle) {
			if (particle.distanceTo(otherVertice) < MINIMUM_SOCIAL_DISTANCE) {
				moveX += particle.x - otherVertice.x;
				moveY += particle.y - otherVertice.y;
				moveZ += particle.z - otherVertice.z;
			}
		}
	}

	particle.velocity.x += moveX * SOCIAL_DISTANCING_FACTOR;
	particle.velocity.y += moveY * SOCIAL_DISTANCING_FACTOR;
	particle.velocity.z += moveZ * SOCIAL_DISTANCING_FACTOR;

	// let personalSpaceNeeded = inPlaceVector;
	// resetVector(personalSpaceNeeded);
	// for (let otherParticle of particleSystemGeometry.vertices) {
	// 	if (otherParticle !== particle) {
	// 		if (otherParticle !== particle && particle.distanceTo(otherParticle) < MINIMUM_SOCIAL_DISTANCE) {
	// 			personalSpaceNeeded
	// 				.add(
	// 					inPlaceSocialDistancingParticleVector.subVectors(particle, otherParticle)
	// 				);
	// 		}
	// 	}
	// }

	// particle.velocity
	// 	.add(
	// 		personalSpaceNeeded.multiplyScalar(SOCIAL_DISTANCING_FACTOR)
	// 	);
}

// Adjusts particle velocity to align with average velocity within visual range
function updateVelocityForSocialCohesion(particle) {
	let avgVelocity = inPlaceVector;
	resetVector(avgVelocity);
	let numNeighbors = 0;

	for (let otherParticle of particleSystemGeometry.vertices) {
		if (particle.distanceTo(otherParticle) < PARTICLE_VISUAL_RANGE) {
			avgVelocity.add(otherParticle.velocity);
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		avgVelocity.divideScalar(numNeighbors);
		const velocityDelta = avgVelocity.sub(particle.velocity);
		particle.velocity.add(
			velocityDelta.multiplyScalar(SOCIAL_COHESION_FACTOR)
		);
	}
}

// Prevent particle from going too fast
function updateVelocityForVelocityLimit(particle) {
	if (particle.velocity.length() > PARTICLE_MAX_VELOCITY) {
		particle.velocity = particle.velocity
			.normalize()
			.multiplyScalar(PARTICLE_MAX_VELOCITY);
	}
}

function updateVelocityForPositionBoundary(particle) {
	updateVelocityForPositionBoundaryOnDimension(particle, 'x', X_BOUNDARY);
	updateVelocityForPositionBoundaryOnDimension(particle, 'y', Y_BOUNDARY);
	updateVelocityForPositionBoundaryOnDimension(particle, 'z', Z_BOUNDARY);
}

function updateVelocityForPositionBoundaryOnDimension(particle, dimension, absoluteBoundary) {
	if (particle[dimension] > absoluteBoundary) {
		particle.velocity[dimension] -= PARTICLE_TURN_ACCELERATION;
	} else if (particle[dimension] < -1 * absoluteBoundary) {
		particle.velocity[dimension] += PARTICLE_TURN_ACCELERATION;
	}
}

function updatePositionForBoundary(camera) {
	cameraBoundarySphere.clampPoint(camera.position, camera.position);
}

function updateSunPosition() {
	var uniforms = sky.material.uniforms;

	if (sunConfig.inclination >= sunConfig.targetInclination) {
		sunConfig.inclination -= 0.00002;
	}
	var theta = Math.PI * (sunConfig.inclination - 0.5);
	var phi = 2 * Math.PI * (sunConfig.azimuth - 0.5);

	sunSphere.position.x = sunConfig.distance * Math.cos(phi);
	sunSphere.position.y = sunConfig.distance * Math.sin(phi) * Math.sin(theta);
	sunSphere.position.z = sunConfig.distance * Math.sin(phi) * Math.cos(theta);

	uniforms["sunPosition"].value.copy(sunSphere.position);
}

function onWindowResize(camera, renderer) {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function resetVector(vector) {
	vector.x = 0;
	vector.y = 0;
	vector.z = 0;
}

if (WEBGL.isWebGLAvailable()) {

	// Initiate function or other initializations here
	init();
	animate();
} else {
	var warning = WEBGL.getWebGLErrorMessage();
	document.body.appendChild(warning);

}