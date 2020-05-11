/**
 * @author evanrocha https://github.com/EvanRocha
 */
import * as THREE from "./node_modules/three/build/three.module.js";
import {
	OrbitControls
} from './node_modules/three/examples/jsm/controls/OrbitControls.js';

const NUM_PARTICLES = 700;
const PARTICLE_SCALE = 0.65;
const INITIAL_POSITION_RANGE = 1;

// Movement
const INITIAL_PARTICLE_VELOCITY = 0.41;
const MAX_PARTICLE_VELOCITY = 0.405;
const PARTICLE_TURN_ACCELERATION = 0.039;

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
const CAMERA_MAX_POSITION = 75;

let scene = null;
let renderer = null;
let camera = null;
let cameraControls = null;
let cameraBoundarySphere = null;
let particleSystemGeometry = null;

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

	// render
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
};

function initRenderer() {
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
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
	camera.position.z = 35;

	// Sphere to bound the particles
	cameraBoundarySphere = new THREE.Sphere(new THREE.Vector3(), CAMERA_MAX_POSITION);

	cameraControls = new OrbitControls(camera, renderer.domElement);
	cameraControls.update();
}

function initSkyBox() {
	let cols = [{
		stop: 0,
		color: new THREE.Color(0xf7b000)
	}, {
		stop: .35,
		color: new THREE.Color(0xdd0080)
	}, {
		stop: .5,
		color: new THREE.Color(0x622b85)
	}, {
		stop: .75,
		color: new THREE.Color(0x007dae)
	}, {
		stop: 1,
		color: new THREE.Color(0x77c8db)
	}];

	let geometry = new THREE.SphereGeometry(100, 100, 100);
	let material = new THREE.MeshBasicMaterial({
		vertexColors: THREE.VertexColors,
		wireframe: false
	});
	setGradient(geometry, cols, 'y', false);

	material.side = THREE.BackSide;
	scene.add(new THREE.Mesh(geometry, material));
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
	for (var p = 0; p < NUM_PARTICLES; p++) {
		const particle = new THREE.Vector3(
			Math.random() * 2 * INITIAL_POSITION_RANGE - INITIAL_POSITION_RANGE,
			Math.random() * 2 * INITIAL_POSITION_RANGE - INITIAL_POSITION_RANGE,
			Math.random() * 2 * INITIAL_POSITION_RANGE - INITIAL_POSITION_RANGE,
		);

		// create a velocity vector. Hackily add it to the particle object
		particle.velocity = new THREE.Vector3(
			Math.random() * 2 * INITIAL_PARTICLE_VELOCITY - INITIAL_PARTICLE_VELOCITY,
			Math.random() * 2 * INITIAL_PARTICLE_VELOCITY - INITIAL_PARTICLE_VELOCITY,
			Math.random() * 2 * INITIAL_PARTICLE_VELOCITY - INITIAL_PARTICLE_VELOCITY,
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
	if (particle.velocity.length() > MAX_PARTICLE_VELOCITY) {
		particle.velocity = particle.velocity
			.normalize()
			.multiplyScalar(MAX_PARTICLE_VELOCITY);
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

function setGradient(geometry, colors, axis, reverse) {
	geometry.computeBoundingBox();

	let bbox = geometry.boundingBox;
	let size = new THREE.Vector3().subVectors(bbox.max, bbox.min);

	let vertexIndices = ['a', 'b', 'c'];
	let face, vertex, normalized = new THREE.Vector3(),
		normalizedAxis = 0;

	for (let c = 0; c < colors.length - 1; c++) {

		let colorDiff = colors[c + 1].stop - colors[c].stop;

		for (let i = 0; i < geometry.faces.length; i++) {
			face = geometry.faces[i];
			for (let v = 0; v < 3; v++) {
				vertex = geometry.vertices[face[vertexIndices[v]]];
				normalizedAxis = normalized
					.subVectors(vertex, bbox.min)
					.divide(size)[axis];

				if (reverse) {
					normalizedAxis = 1 - normalizedAxis;
				}

				if (normalizedAxis >= colors[c].stop && normalizedAxis <= colors[c + 1].stop) {
					let localNormalizedAxis = (normalizedAxis - colors[c].stop) / colorDiff;
					face.vertexColors[v] = colors[c].color
						.clone()
						.lerp(colors[c + 1].color, localNormalizedAxis);
				}
			}
		}
	}
}

init();
animate();