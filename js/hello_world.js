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


let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(CAMERA_FIELD_OF_VIEW, window.innerWidth / window.innerHeight,
	0.1, 1000);
camera.position.z = 20;

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer
document.body.appendChild(renderer.domElement);


// let particleSystemGeometry = new THREE.Geometry();

// Copy https://threejs.org/examples/#webgl_custom_attributes_points
var particles = new Float32Array(NUM_PARTICLES * 3);
var colors = new Float32Array(NUM_PARTICLES * 3);
var sizes = new Float32Array(NUM_PARTICLES);
let particleSystemGeometry = new THREE.BufferGeometry();


// now create the individual particles
// let particles = new Float32Array(NUM_PARTICLES * 3);
// for (var p = 0; p < NUM_PARTICLES; p += 3) {
// 	const particle = new THREE.Vector3(
// 		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
// 		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
// 		Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE,
// 	);

// 	create a velocity vector
// 	particle.velocity = new THREE.Vector3(
// 		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
// 		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
// 		Math.cos(Math.random() * Math.PI) * INITIAL_PARTICLE_VELOCITY,
// 	);
// 	particleSystemGeometry.vertices.push(particle);

// 	// particles[p] = Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE;
// 	// particles[p + 1] = Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE;
// 	// particles[p + 2] = Math.cos(Math.random() * Math.PI) * INITIAL_POSITION_RANGE;
// }

let vertex = new THREE.Vector3();
let color = new THREE.Color(0xffffff);
for (var p = 0; p < NUM_PARTICLES; p++) {

	vertex.x = (Math.random() * 2 - 1) * INITIAL_POSITION_RANGE;
	vertex.y = (Math.random() * 2 - 1) * INITIAL_POSITION_RANGE;
	vertex.z = (Math.random() * 2 - 1) * INITIAL_POSITION_RANGE;
	vertex.toArray(particles, p * 3);

	if (vertex.x < 0) {

		color.setHSL(0.5 + 0.1 * (p / NUM_PARTICLES), 0.7, 0.5);

	} else {

		color.setHSL(0.0 + 0.1 * (p / NUM_PARTICLES), 0.9, 0.5);

	}

	color.toArray(colors, p * 3);

	sizes[p] = 10;

}

particleSystemGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
particleSystemGeometry.setAttribute(
	'customColor',
	new THREE.BufferAttribute(colors, 3)
);
particleSystemGeometry.setAttribute(
	'size',
	new THREE.BufferAttribute(sizes, 1)
);

let particalMaterial = new THREE.PointsMaterial({
	color: 0xFFFFFF,
	size: PARTICLE_SCALE,
});

var sparklyMaterial = new THREE.ShaderMaterial({
	uniforms: {
		color: {
			value: new THREE.Color(0xffffff)
		},
		pointTexture: {
			value: new THREE.TextureLoader().load("../textures/sprites/spark1.png")
		}
	},
	// vertexShader: document.getElementById('vertexshader').textContent,
	// fragmentShader: document.getElementById('fragmentshader').textContent,

	// blending: THREE.AdditiveBlending,
	// depthTest: false,
	// transparent: true,

});

// create the particle system
let particleSystem = new THREE.Points(
	particleSystemGeometry,
	sparklyMaterial
);
scene.add(particleSystem);

let animate = function() {

	// particleSystemGeometry.vertices.map(vertice => {
	// 	applySocialAttraction(vertice);
	// 	applySocialDistancing(vertice);
	// 	applySocialCohesion(vertice);
	// 	applyVelocityLimit(vertice);
	// 	applyPositionBoundary(vertice, 'x', X_BOUNDARY);
	// 	applyPositionBoundary(vertice, 'y', Y_BOUNDARY);
	// 	applyPositionBoundary(vertice, 'z', Z_BOUNDARY);

	// 	// update the position
	// 	vertice.x = vertice.x + vertice.velocity.x;
	// 	vertice.y = vertice.y + vertice.velocity.y;
	// 	vertice.z = vertice.z + vertice.velocity.z;
	// });

	// particleSystem.geometry.verticesNeedUpdate = true;

	let geometry = particleSystem.geometry;
	let attributes = geometry.attributes;
	var time = Date.now() * 0.005;

	for (var i = 0; i < attributes.size.array.length; i++) {
		attributes.size.array[i] = 14 + 13 * Math.sin(0.1 * i + time);

	}

	attributes.size.needsUpdate = true;


	renderer.render(scene, camera);
	// requestAnimationFrame(animate);
};

animate();

window.addEventListener('resize', onWindowResize, false);


function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

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


// TODO: 
// Make particles look pretty (lights?!?!)
// Make camera moveable