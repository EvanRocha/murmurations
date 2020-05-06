
import * as THREE from './node_modules/three/src/Three.js';

const NUM_PARTICLES= 300;
const INITIAL_POSITION_RANGE = 5;
const PARTICLE_VELOCITY = 1.01;
const PARTICLE_SCALE = 0.25;



let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 20;

let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

let geometry = new THREE.SphereGeometry();
// var particlePrototype = new THREE.Mesh(geometry, material);

const particlesDirection = new Array()	
const particles = new Array(NUM_PARTICLES).fill(undefined).map(_ => {

	let material = new THREE.MeshBasicMaterial({color: randomHex()});
	let particle = new THREE.Mesh(geometry, material);

	// sets initial position between [-1,1] * INITIAL_POSITION_RANGE
	particle.position.set(
		Math.cos(Math.random()* Math.PI) * INITIAL_POSITION_RANGE,
		Math.cos(Math.random()* Math.PI) * INITIAL_POSITION_RANGE,
		Math.cos(Math.random()* Math.PI) * INITIAL_POSITION_RANGE,
	);

	particle.scale.set(PARTICLE_SCALE, PARTICLE_SCALE, PARTICLE_SCALE);
	scene.add(particle);
	return particle;
});

let animate = function () {
	particles.forEach(particle => {
		particle.position.x *= PARTICLE_VELOCITY;
		particle.position.y *= PARTICLE_VELOCITY
		particle.position.z *= PARTICLE_VELOCITY;
	});

	renderer.render(scene, camera);

	requestAnimationFrame(animate);
};

function randomHex() {
	return "#000000".replace(/0/g,function(){return (~~(Math.random()*16)).toString(16);});
}

animate();