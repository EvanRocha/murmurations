import * as THREE from "./node_modules/three/build/three.module.js";
import {
	OrbitControls
} from './OrbitControls.js';

const NUM_PARTICLES = 1000;
const PARTICLE_SCALE = 0.6;
const INITIAL_POSITION_RANGE = 10;

// Movement
const INITIAL_PARTICLE_VELOCITY = 0.20;
const MAX_PARTICLE_VELOCITY = 0.405;
const PARTICLE_TURN_ACCELERATION = 0.04;

// Social
const PARTICLE_VISUAL_RANGE = 2;
const SOCIAL_ATTRACTION_FACTOR = 0.5;
const SOCIAL_COHESION_FACTOR = 0.5;
const SOCIAL_DISTANCING_FACTOR = 0.35;
const MINIMUM_SOCIAL_DISTANCE = 1.25;

// Boundaries
const X_BOUNDARY = 14;
const Y_BOUNDARY = 10;
const Z_BOUNDARY = 10;

const CAMERA_FIELD_OF_VIEW = 75;
const CAMERA_MAX_POSITION = 75;

// Random Helpers:
function onWindowResize(camera, renderer) {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function setGradient(geometry, colors, axis, reverse) {

	geometry.computeBoundingBox();

	var bbox = geometry.boundingBox;
	var size = new THREE.Vector3().subVectors(bbox.max, bbox.min);

	var vertexIndices = ['a', 'b', 'c'];
	var face, vertex, normalized = new THREE.Vector3(),
		normalizedAxis = 0;

	for (var c = 0; c < colors.length - 1; c++) {

		var colorDiff = colors[c + 1].stop - colors[c].stop;

		for (var i = 0; i < geometry.faces.length; i++) {
			face = geometry.faces[i];
			for (var v = 0; v < 3; v++) {
				vertex = geometry.vertices[face[vertexIndices[v]]];
				normalizedAxis = normalized.subVectors(vertex, bbox.min).divide(size)[axis];
				if (reverse) {
					normalizedAxis = 1 - normalizedAxis;
				}
				if (normalizedAxis >= colors[c].stop && normalizedAxis <= colors[c + 1].stop) {
					var localNormalizedAxis = (normalizedAxis - colors[c].stop) / colorDiff;
					face.vertexColors[v] = colors[c].color.clone().lerp(colors[c + 1].color, localNormalizedAxis);
				}
			}
		}
	}
}


let scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f0f);

var rev = false;
var cols = [{
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


let camera = new THREE.PerspectiveCamera(
	CAMERA_FIELD_OF_VIEW,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);
camera.position.z = 35;

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Skybox
var geometry = new THREE.SphereGeometry(100, 100, 100);
var material = new THREE.MeshBasicMaterial({
	vertexColors: THREE.VertexColors,
	wireframe: false
});
setGradient(geometry, cols, 'y', false);
material.side = THREE.BackSide;
var sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Sphere to bound the particles
const cameraBoundarySphere = new THREE.Sphere(new THREE.Vector3(), CAMERA_MAX_POSITION);


let particleSystemGeometry = new THREE.Geometry();
let particalMaterial = new THREE.PointsMaterial({
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

	particleSystemGeometry.vertices.push(particle);
}

// create the particle system
let particleSystem = new THREE.Points(
	particleSystemGeometry,
	particalMaterial
);
scene.add(particleSystem);

let animate = () => {

	particleSystemGeometry.vertices.map(vertice => {
		applySocialAttraction(vertice);
		applySocialDistancing(vertice);
		applySocialCohesion(vertice);
		applyVelocityLimit(vertice);

		applyPositionBoundary(vertice, 'x', X_BOUNDARY);
		applyPositionBoundary(vertice, 'y', Y_BOUNDARY);
		applyPositionBoundary(vertice, 'z', Z_BOUNDARY);

		// update the position
		vertice.add(vertice.velocity);
	});

	particleSystem.geometry.verticesNeedUpdate = true;

	controls.update();
	applyCameraPositionBoundary(camera);

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
};

// Adjusts velocity of vertice towards center of other vertices in its visual range
function applySocialAttraction(vertice) {
	let visualCenter = new THREE.Vector3();
	let numNeighbors = 0;

	for (let otherVertice of particleSystemGeometry.vertices) {
		if (vertice.distanceTo(otherVertice) < PARTICLE_VISUAL_RANGE) {
			visualCenter.add(otherVertice);
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		visualCenter.divideScalar(numNeighbors);
		vertice.velocity.add(visualCenter
			.sub(vertice)
			.multiplyScalar(SOCIAL_ATTRACTION_FACTOR)
		);
	}
}


// Adjusts velocity of vertice away from boids that are to close
function applySocialDistancing(vertice) {
	let personalSpaceNeeded = new THREE.Vector3();
	for (let otherVertice of particleSystemGeometry.vertices) {

		if (otherVertice !== vertice &&
			vertice.distanceTo(otherVertice) < MINIMUM_SOCIAL_DISTANCE) {
			personalSpaceNeeded
				.add(vertice
					.clone()
					.sub(otherVertice)
				);
		}
	}

	vertice.velocity
		.add(
			personalSpaceNeeded.multiplyScalar(SOCIAL_DISTANCING_FACTOR)
		);
}

// Adjusts vertice velocity to align with average velocity within visual range
function applySocialCohesion(vertice) {
	let avgVelocity = new THREE.Vector3();
	let numNeighbors = 0;

	for (let otherVertice of particleSystemGeometry.vertices) {
		if (vertice.distanceTo(otherVertice) < PARTICLE_VISUAL_RANGE) {
			avgVelocity.add(otherVertice.velocity);
			numNeighbors += 1;
		}
	}

	if (numNeighbors) {
		avgVelocity.divideScalar(numNeighbors);
		const velocityDelta = avgVelocity.sub(vertice.velocity);
		vertice.velocity.add(
			velocityDelta.multiplyScalar(SOCIAL_COHESION_FACTOR)
		);
	}
}


// Speed will naturally vary in flocking behavior, but real animals can't go
// arbitrarily fast.
function applyVelocityLimit(vertice) {
	if (vertice.velocity.length() > MAX_PARTICLE_VELOCITY) {
		vertice.velocity = vertice.velocity
			.normalize()
			.multiplyScalar(MAX_PARTICLE_VELOCITY);
	}
}

function applyPositionBoundary(vertice, dimension, absoluteBoundary) {
	if (vertice[dimension] > absoluteBoundary) {
		vertice.velocity[dimension] -= PARTICLE_TURN_ACCELERATION;
	} else if (vertice[dimension] < -1 * absoluteBoundary) {
		vertice.velocity[dimension] += PARTICLE_TURN_ACCELERATION;
	}
}


function applyCameraPositionBoundary(camera) {
	cameraBoundarySphere.clampPoint(camera.position, camera.position);
}

function init() {
	window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
}

init();
animate();