import * as THREE from 'three';
import {
    GLTFLoader,
    OrbitControls,
    Sky,
} from 'three/examples/jsm/Addons.js';

import gsap from 'gsap';
import GUI from 'lil-gui';

import vShader from './shaders/vertex.glsl';
import fShader from './shaders/fragment.glsl';

/**
 * Base
 */
// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
};
sizes.resolution = new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio);

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 0, 5);
scene.add(camera);

const models = [
    './models/papa.glb',
    './models/wish.glb',
    './models/good.glb',
    './models/day.glb',
];

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const fireworkTextures = [
    textureLoader.load('./particles/1.png'),
    textureLoader.load('./particles/2.png'),
    textureLoader.load('./particles/3.png'),
    textureLoader.load('./particles/4.png'),
    textureLoader.load('./particles/5.png'),
    textureLoader.load('./particles/6.png'),
    textureLoader.load('./particles/7.png'),
    textureLoader.load('./particles/8.png'),
];

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 3.6);
scene.add(ambientLight);

const loaders = new GLTFLoader();

const createFireworks = (file) => {
    loaders.load(file, (response) => {
        const model = response.scene;

        const particlesGeometry = new THREE.BufferGeometry();
        const particlesNumber = 9000;
        const particlesPosition = new Float32Array(particlesNumber * 3);
        const particlesSize = new Float32Array(particlesNumber);
        const particlesTimeMultipliers = new Float32Array(particlesNumber);

        // Traverse the model to find all meshes
        model.traverse((object) => {
            if (object.isMesh) {
                // Get the positions from the mesh geometry
                const positionAttribute = object.geometry.attributes.position;

                for (let i = 0; i < particlesNumber; i++) {
                    const i3 = i * 3;

                    const spherical = new THREE.Spherical(
                        (0.5 + Math.random()) * (0.75 + Math.random() * 0.25),
                        Math.random() * Math.PI,
                        Math.random() * Math.PI * 2
                    );
                    const position = new THREE.Vector3();
                    position.setFromSpherical(spherical);

                    // Randomly select a vertex position from the mesh
                    const vertexIndex = Math.floor(Math.random() * positionAttribute.count);
                    particlesPosition[i3 + 0] = positionAttribute.getX(vertexIndex);
                    particlesPosition[i3 + 1] = positionAttribute.getY(vertexIndex);
                    particlesPosition[i3 + 2] = positionAttribute.getZ(vertexIndex);

                    particlesSize[i] = Math.random();
                    particlesTimeMultipliers[i] = 1.0 + Math.random();
                }
            }
        });

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPosition, 3));
        particlesGeometry.setAttribute('aSize', new THREE.BufferAttribute(particlesSize, 1));
        particlesGeometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(particlesTimeMultipliers, 1));

        const color = new THREE.Color();
        color.setHSL(Math.random(), 1, 0.7);
        const particlesMaterial = new THREE.ShaderMaterial({
            vertexShader: vShader,
            fragmentShader: fShader,
            uniforms: {
                uSize: new THREE.Uniform(0.1 + Math.random() * 0.1),
                uResolution: new THREE.Uniform(sizes.resolution),
                uTexture: new THREE.Uniform(fireworkTextures[Math.floor(Math.random()) * fireworkTextures.length]),
                uColor: new THREE.Uniform(color),
                uProgress: new THREE.Uniform(0)
            },
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        particles.position.set(-3.4, 0, 0);
        particles.rotation.set(1.7, 0, 0);
        scene.add(particles);

        // destroy
        const destroy = () => {
            scene.remove(particles);
            particlesGeometry.dispose();
            particlesMaterial.dispose();
        };

        // Animate
        gsap.to(
            particlesMaterial.uniforms.uProgress,
            {
                value: 1,
                duration: 3,
                ease: 'linear',
                onComplete: destroy
            }
        );
    });
};

let modelNumber = 0;
window.addEventListener('click', () => {
    if (modelNumber > models.length - 1) {
        modelNumber = 0;
    }
    createFireworks(models[modelNumber]);
    modelNumber++
});

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    sizes.resolution.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio);
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(sizes.pixelRatio);
});

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setClearColor(0x000000);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

/**
 * Sky
 */
// Add Sky
const  sky = new Sky();
sky.scale.setScalar( 450000 );
scene.add( sky );

const sun = new THREE.Vector3();

const skyParameters = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.95,
    elevation: -2.2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure
};

function updateSky() {

    const uniforms = sky.material.uniforms;
    uniforms[ 'turbidity' ].value = skyParameters.turbidity;
    uniforms[ 'rayleigh' ].value = skyParameters.rayleigh;
    uniforms[ 'mieCoefficient' ].value = skyParameters.mieCoefficient;
    uniforms[ 'mieDirectionalG' ].value = skyParameters.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad( 90 - skyParameters.elevation );
    const theta = THREE.MathUtils.degToRad( skyParameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    uniforms[ 'sunPosition' ].value.copy( sun );

    renderer.toneMappingExposure = skyParameters.exposure;
    renderer.render( scene, camera );

}

const skyGUI = gui.addFolder("Sky");

skyGUI.add( skyParameters, 'turbidity', 0.0, 20.0, 0.1 ).onChange( updateSky );
skyGUI.add( skyParameters, 'rayleigh', 0.0, 4, 0.001 ).onChange( updateSky );
skyGUI.add( skyParameters, 'mieCoefficient', 0.0, 0.1, 0.001 ).onChange( updateSky );
skyGUI.add( skyParameters, 'mieDirectionalG', 0.0, 1, 0.001 ).onChange( updateSky );
skyGUI.add( skyParameters, 'elevation', -3, 90, 0.001 ).onChange( updateSky );
skyGUI.add( skyParameters, 'azimuth', - 180, 180, 0.1 ).onChange( updateSky );
skyGUI.add( skyParameters, 'exposure', 0, 1, 0.0001 ).onChange( updateSky );

updateSky();

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime();

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();
