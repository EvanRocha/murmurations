import * as THREE from './node_modules/three/src/Three.js';

const NUM_PARTICLES = 300;
const INITIAL_POSITION_RANGE = 10;
const PARTICLE_VELOCITY = 1.01;
const PARTICLE_SCALE = 0.3;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
		0, // x
		-15,
		0,
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
		// check if we need to reset
		if (vertice.y < -15) {
			vertice.y = 15;
			vertice.velocity.y = 0;
		}

		// update the velocity with
		// a splat of randomniz
		vertice.velocity.y -= Math.random() * .1;

		// update the position
		vertice.x = vertice.x + vertice.velocity.x;
		vertice.y = vertice.y + vertice.velocity.y;
		vertice.z = vertice.z + vertice.velocity.z;
	});

	particleSystem.geometry.verticesNeedUpdate = true;
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
};

function randomHex() {
	return "#000000".replace(/0/g, function() {
		return (~~(Math.random() * 16)).toString(16);
	});
}

animate();