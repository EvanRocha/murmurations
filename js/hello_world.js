import * as THREE from './node_modules/three/src/Three.js';

const NUM_PARTICLES = 1000;
const PARTICLE_SCALE = 0.2;
const INITIAL_POSITION_RANGE = 15;

// Movement
const INITIAL_PARTICLE_VELOCITY = 0.20;
const MAX_PARTICLE_VELOCITY = 0.45;
const PARTICLE_TURN_ACCELERATION = 0.1;

// Social
const PARTICLE_VISUAL_RANGE = 2;
const SOCIAL_ATTRACTION_FACTOR = 0.5;
const SOCIAL_COHESION_FACTOR = 0.5;
const SOCIAL_DISTANCING_FACTOR = 0.5;
const MINIMUM_SOCIAL_DISTANCE = 1.25;

// Boundaries
const X_BOUNDARY = 12;
const Y_BOUNDARY = 9;
const Z_BOUNDARY = 9;

const CAMERA_FIELD_OF_VIEW = 75;

// Random Helpers:

function randomHex() {
	return "#000000".replace(/0/g, function() {
		return (~~(Math.random() * 16)).toString(16);
	});
}

function distanceBetween(vertice1, vertice2) {
	return Math.sqrt(
		Math.pow(vertice1.x - vertice2.x, 2) +
		Math.pow(vertice1.y - vertice2.y, 2) +
		Math.pow(vertice1.z - vertice2.z, 2)
	);
}

function totalSpeed(vertice) {
	return Math.sqrt(
		vertice.velocity.x * vertice.velocity.x +
		vertice.velocity.y * vertice.velocity.y +
		vertice.velocity.z * vertice.velocity.z
	);
}


let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW, window.innerWidth / window.innerHeight,
	0.1, 1000);
camera.position.z = 20;

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


let particleSystemGeometry = new THREE.Geometry();
let particalMaterial = new THREE.PointsMaterial({
	color: 0xFFFFFF,
	size: PARTICLE_SCALE
});

// now create the individual particles
for (var p = 0; p < NUM_PARTICLES; p++) {
	const particle = new THREE.Vector3(
		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
	);

	// create a velocity vector
	particle.velocity = new THREE.Vector3(
		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
	);

	// particleSystemGeometry.colors.push(randomHex());
	particleSystemGeometry.vertices.push(particle);
}

// create the particle system
let particleSystem = new THREE.Points(
	particleSystemGeometry,
	particalMaterial
);
scene.add(particleSystem);

let animate = function() {

	particleSystemGeometry.vertices.map(vertice => {
		applySocialAttraction(vertice);
		applySocialDistancing(vertice);
		applySocialCohesion(vertice);
		applyVelocityLimit(vertice);
		applyPositionBoundary(vertice, 'x', X_BOUNDARY);
		applyPositionBoundary(vertice, 'y', Y_BOUNDARY);
		applyPositionBoundary(vertice, 'z', Z_BOUNDARY);

		// update the position
		vertice.x = vertice.x + vertice.velocity.x;
		vertice.y = vertice.y + vertice.velocity.y;
		vertice.z = vertice.z + vertice.velocity.z;
	});

	particleSystem.geometry.verticesNeedUpdate = true;
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
};

// Find the center of mass of the other boids and adjust velocity slightly to
// point towards the center of mass.
function applySocialAttraction(vertice) {
	let centerX = 0;
	let centerY = 0;
	let centerZ = 0
	let numNeighbors = 0;

	for (let otherVertice of particleSystemGeometry.vertices) {
		if (distanceBetween(vertice, otherVertice) < PARTICLE_VISUAL_RANGE) {
			centerX += otherVertice.x;
			centerY += otherVertice.y;
			centerZ += otherVertice.z;
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		centerX = centerX / numNeighbors;
		centerY = centerY / numNeighbors;
		centerZ = centerZ / numNeighbors;

		vertice.velocity.x += (centerX - vertice.x) * SOCIAL_ATTRACTION_FACTOR;
		vertice.velocity.y += (centerY - vertice.y) * SOCIAL_ATTRACTION_FACTOR;
		vertice.velocity.z += (centerZ - vertice.z) * SOCIAL_ATTRACTION_FACTOR;
	}
}


// Move away from other boids that are too close to avoid colliding
function applySocialDistancing(vertice) {
	let moveX = 0;
	let moveY = 0;
	let moveZ = 0;
	for (let otherVertice of particleSystemGeometry.vertices) {
		if (otherVertice !== vertice) {
			if (distanceBetween(vertice, otherVertice) < MINIMUM_SOCIAL_DISTANCE) {
				moveX += vertice.x - otherVertice.x;
				moveY += vertice.y - otherVertice.y;
				moveZ += vertice.z - otherVertice.z;
			}
		}
	}

	vertice.velocity.x += moveX * SOCIAL_DISTANCING_FACTOR;
	vertice.velocity.y += moveY * SOCIAL_DISTANCING_FACTOR;
	vertice.velocity.z += moveZ * SOCIAL_DISTANCING_FACTOR;
}

// Find the average velocity (speed and direction) of the other boids and
// adjust velocity slightly to match.
function applySocialCohesion(vertice) {
	let avgDX = 0;
	let avgDY = 0;
	let avgDZ = 0;
	let numNeighbors = 0;

	for (let otherVertice of particleSystemGeometry.vertices) {
		if (distanceBetween(vertice, otherVertice) < PARTICLE_VISUAL_RANGE) {
			avgDX += otherVertice.velocity.x;
			avgDY += otherVertice.velocity.y;
			avgDZ += otherVertice.velocity.z;
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		avgDX = avgDX / numNeighbors;
		avgDY = avgDY / numNeighbors;
		avgDZ = avgDZ / numNeighbors;

		vertice.velocity.x += (avgDX - vertice.velocity.x) * SOCIAL_COHESION_FACTOR;
		vertice.velocity.y += (avgDY - vertice.velocity.y) * SOCIAL_COHESION_FACTOR;
		vertice.velocity.z += (avgDZ - vertice.velocity.z) * SOCIAL_COHESION_FACTOR;
	}
}


// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function applyVelocityLimit(vertice) {
	const speed = totalSpeed(vertice);
	if (speed > MAX_PARTICLE_VELOCITY) {
		vertice.velocity.x = (vertice.velocity.x / speed) * MAX_PARTICLE_VELOCITY;
		vertice.velocity.y = (vertice.velocity.y / speed) * MAX_PARTICLE_VELOCITY;
		vertice.velocity.z = (vertice.velocity.z / speed) * MAX_PARTICLE_VELOCITY;
	}
}

function applyPositionBoundary(vertice, dimension, absoluteBoundary) {
	if (vertice[dimension] > absoluteBoundary) {
		vertice.velocity[dimension] -= PARTICLE_TURN_ACCELERATION;
	} else if (vertice[dimension] < -1 * absoluteBoundary) {
		vertice.velocity[dimension] += PARTICLE_TURN_ACCELERATION;
	}
}


animate();


// TODO: 
// Make boid!
// Make particles look pretty (lights?!?!)
// Make camera moveable