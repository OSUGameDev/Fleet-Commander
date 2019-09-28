import { GUI } from '../three.js/examples/jsm/libs/dat.gui.module.js';

import { EffectComposer } from '../three.js/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../three.js/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../three.js/examples/jsm/postprocessing/ShaderPass.js';

import { UnrealBloomPass } from '../three.js/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from '../three.js/examples/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from '../three.js/examples/jsm/shaders/SobelOperatorShader.js';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { Quaternion, Object3D, Vector3 } from '../three.js/src/Three.js';

//import { Ship, Cruiser, Destroyer, laser, cannon, explosion } from './ships.js';
//import { Cruiser } from './ships.js';

//Some basic component
var scene,
    camera,
    renderer;

//These are all the visual effects
var effectSobel,
    renderScene,
    bloomPass,
    composerOn,
    composerOff;

//This is used to control the gui
var gui,
    des_folder,
    cru_folder,
    bat_folder,
    effect_folder;

//All the world components list, used to handle the non-ship object in the world
var light_list,
    laser_list,
    projectile_list,
    explosion_list;

//These were used for selection phase and battle phase
var player_ship_list,
    computer_ship_list;

//These were used to handle the game process
var total_point,
    player_point,
    computer_point;

//This is the flag for differentiate each phases
var isBattle = false;

//All the world constant
var angle = 0;
var dt = 0.01;

//This is used to control the parameter of the post-processing effect
var params = {
    //Setting for bloom effect
    exposure: 1.2,
    bloomStrength: 1.5,
    bloomThreshold: 0.25,
    bloomRadius: 0.5,

    //Setting for sobel
    Sobel_effect: false
};

class Ship
{
    class;
    hp;
    shield;
    speed;

    size;
    sensor;

    model;          //Store the ship's model, but seems didn't work
    Geometry;       //The ship's whole Geometry, include the firepoint and model

    cannon_attack_point_list;                   //This is the sub cannon of Cruiser class ship
    laser_cooldown;

    iron_laser_attack_point_list;               //This is the main cannon of the Cruiser class ship
    iron_laser_cooldown;                        //This is the cool down for the laser attack
    iron_laser_radius;                          //This is the factor that affect the radius of the iron cannon's laser (visual effect)
    iron_frequency;                             //This is the factor that affect the frequency of the iron cannon attack

    position;       //The ship's position
    rand;           //A factor that controls the ship's floating animation
    point;          //The number of points that the ship worth, used to build the fleet

    ifsunk;
    if_iron_attack;         //If the iron cannon currently firing
    if_laser_attack;        //If the laser cannon currently firing

    constructor(sclass, shp, sshield, sspeed, factor, ssize, ssensor)
    {
        this.class = sclass;
        this.hp = shp;
        this.shield = sshield;
        this.speed = sspeed;
        this.ifsunk = false;

        this.size = ssize;
        this.sensor = ssensor;

        //Initialize the attack point list
        this.cannon_attack_point_list = [];
        this.iron_laser_attack_point_list = [];

        //Initialize the status
        this.if_iron_attack = false;
        this.if_laser_attack = false;

        this.rand = factor * (Math.floor(Math.random() * Math.floor(1000)) / 900);
    }

    createGeometry(type, path)
    {
        //This is the object that will contain all the meshes of the ship
        //this.Geometry = new THREE.Mesh(new THREE.SphereBufferGeometry(6, 30, 30), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.0 }));
        this.Geometry = new THREE.Object3D();

        //Load the model
        var newobject = this.load(path);

        //Store and save the model with current object's geometry
        newobject.then(obj =>
        {
            obj.scene.traverse(function (mod)
            {
                mod.castShadow = true;
                mod.receiveShadow = true;
            });

            //Read the model the set the base position
            this.model = obj.scene;
            if (type === 1)     //Destroyer
            {
                this.model.rotation.y = Math.PI / 2;
                this.model.position.set(2.5, -4, 2.5);
            }
            else if (type === 2)        //Crusier
            {
                this.model.position.set(-4, -5, 4);
            }

            //Link the model with Geometry
            this.Geometry.add(this.model);
        });
    }

    load(path)
    {
        var progress = console.log;
        /*
        return new Promise(function (resolve, reject)
        {
            var obj;
            var mtlLoader = new THREE.MTLLoader();
            mtlLoader.load('./js/model/Fleet/Crusier.mtl', function (materials)
            {
                materials.preload();
                var objLoader = new THREE.OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load('./js/model/Fleet/Crusier.obj', resolve, progress, reject);
            }, progress, reject);
        });
        */
        return new Promise(function (resolve, reject)
        {
            var loader = new THREE.GLTFLoader();
            loader.load(path, resolve);
        });
    }

    setPosition(x, y, z)
    {
        this.position = [x, y, z];
        this.Geometry.position.set(x, y, z);
    }

    /**
     * This function used to choose the target ship to attack
     * @param {[Ship]} ship_list - The target list of ship that contains the target ship
     * @return {int} - The position of the target ship in the ship list
     */
    selectTarget(ship_list)
    {
        var i, min, target;
        min = 99999;
        for (i = 0; i < ship_list.length; i++)
        {
            //Get the row hp
            var target_ship_hp = ship_list[i].hp;
            //Get the class difference
            var class_dif = this.class - ship_list[i].class;
            if (class_dif > 0)
                target_ship_hp *= class_dif * 3;
            if (target_ship_hp < min)
            {
                min = target_ship_hp;
                target = i;
            }
        }
        return target;
    }

    /**
     * This function is used to generate the cannon attack between two ships
     * @param {Ship} target_ship - The ship being attack.
     * @return {boolean} - If the attack performed.
     */
    laserAttack(target_ship)
    {
        //Check if the attack could be performed
        if (!this.if_laser_attack && !this.ifsunk)
        {
            //Perform the attack
            return this.laserAttackStart(target_ship);
        }
        else
            return false;
    }

    /**
     * This function used to generate the information used for generate the cannon projectile
     * @param {Ship} target_ship - This is the ship being attack
     * @return {[Vector3]} - If not false, then contain multiple coordinates pair for generate the cannon projectile
     */
    laserAttackStart(target_ship)
    {
        if (!target_ship.ifsunk)
        {
            var i, random_error_x, random_error_y, random_error_z, destination;
            var result = [];
            //Read each subcannon and generate the process
            for (i = 0; i < this.cannon_attack_point_list.length; i++)
            {
                var subresult = [];
                //Get the world position of the attack point, which is the origin point of the attack
                var origin = new THREE.Vector3();
                this.cannon_attack_point_list[i].getWorldPosition(origin);
                //Push the origin position
                subresult.push(new THREE.Vector3().copy(origin));
                //Check if hit the target
                if (target_ship.receiveAttack(1, this.size, this.sensor))
                {
                    //Calculate the target position with random generated errors
                    random_error_z = Math.floor(Math.random() * Math.floor(4)) - 2;
                    //Calculate the destination point with random error
                    destination = new THREE.Vector3(target_ship.Geometry.position.x, target_ship.Geometry.position.y, target_ship.Geometry.position.z + random_error_z);
                }
                else
                {
                    //Calculate the target position with random generated errors
                    random_error_x = Math.floor(Math.random() * Math.floor(8)) - 4;
                    if (random_error_x > 0)
                        random_error_x += 5;
                    else
                        random_error_x -= 5;
                    random_error_y = Math.floor(Math.random() * Math.floor(8)) - 4;
                    //Calculate the destination point with random error
                    destination = new THREE.Vector3(target_ship.Geometry.position.x + random_error_x, target_ship.Geometry.position.y + random_error_y, target_ship.Geometry.position.z);
                    //Get the result vector point from origin point to destination point
                    destination.sub(origin);
                    destination.multiplyScalar(Math.random() * 0.5 + 1);
                    destination.add(origin);
                }
                //Store the second result point as destination
                subresult.push(destination);
                result.push(subresult);
            }
            this.if_laser_attack = true;
            return result;
        }
        else
            return false;
    }

    /**
     * This function was used to generate an iron cannon attack between two ships
     * @param {Ship} target_ship - The ship being attack.
     * @returns {[Vector3]} - If not false, then contain coordinates for generate the laser beam
     */
    ironAttack(target_ship)
    {
        //Check if ship is in the attacking mode and if the ship can perform the attack and the target ship is alive
        if (!this.if_iron_attack && !this.ifsunk && !target_ship.ifsunk)
        {
            //Check if the ship will perform the attack
            var chance = Math.floor(Math.random() * Math.floor(1000));
            //The ship only have 2% chance per frame to perform the attack
            if (chance > 980)
            {
                return this.ironAttackStart(target_ship);
            }
        }
        else
            return false;
    }

    /**
     * This function was used to generate the information of the laser used for the iron cannon attack
     * @param {Ship} target_ship - Ths ship that receive the iron cannon attack
     * @return {[Vector3]} - The array contain the origin and destination point in the form of Vector3
     */
    ironAttackStart(target_ship)
    {
        if (!target_ship.ifsunk && this.iron_laser_attack_point_list.length !== 0)
        {
            var i, random_error_x, random_error_y, random_error_z, destination;
            var result = [];
            //Read each subcannon and generate the process
            for (i = 0; i < this.iron_laser_attack_point_list.length; i++)
            {
                //Get the world position of the attack point, which is the origin point of the attack
                var origin = new THREE.Vector3();
                this.iron_laser_attack_point_list[i].getWorldPosition(origin);
                //Push the origin position
                result.push(new THREE.Vector3().copy(origin));
                //Check if hit the target
                if (target_ship.receiveAttack(1, this.size, this.sensor))
                {
                    //Calculate the target position with random generated errors
                    random_error_z = Math.floor(Math.random() * Math.floor(4)) - 2;
                    //Calculate the destination point with random error
                    destination = new THREE.Vector3(target_ship.Geometry.position.x, target_ship.Geometry.position.y, target_ship.Geometry.position.z + random_error_z);
                }
                else
                {
                    //Calculate the target position with random generated errors
                    random_error_x = Math.floor(Math.random() * Math.floor(8)) - 4;
                    if (random_error_x > 0)
                        random_error_x += 5;
                    else
                        random_error_x -= 5;
                    random_error_y = Math.floor(Math.random() * Math.floor(8)) - 4;
                    //Calculate the destination point with random error
                    destination = new THREE.Vector3(target_ship.Geometry.position.x + random_error_x, target_ship.Geometry.position.y + random_error_y, target_ship.Geometry.position.z);
                    //Get the result vector point from origin point to destination point
                    destination.sub(origin);
                    destination.multiplyScalar(Math.random() * 0.5 + 1);
                    destination.add(origin);
                }
                //Store the second result point as destination
                result.push(destination);
            }
            this.if_iron_attack = true;
            return result;
        }
        else
            return false;
    }

    /**
     * This function is used to calculate the result of an attack from another ship
     * @name receiveAttack  
     * @param {int} method - The type of attack, 1 represent the cannon attack, 2 represent the iron cannon attack.
     * @param {int} attack_size - The attack ship's size.
     * @param {int} attack_sensor - The attack ship's sensor level.
     * @return {boolean} - The result of the attack, true for hit, false for miss.
     */
    receiveAttack(method, attack_size, attack_sensor)
    {
        var aim = attack_sensor * (2 - (attack_size - this.size) / attack_size);

        //Calculate the result of the attack
        var hit = Math.floor(Math.random() * 100);
        //Check if hit
        if (hit <= aim)
        {
            return true;
        }
        else
            return false;
    }

    /**
     * This function is used to set the damage that the ship receives
     * @name receiveDamage
     * @param {int} method - The type of attack, 1 represent the cannon attack, 2 represent the iron cannon attack.
     */
    receiveDamage(method)
    {
        var damage = (Math.floor(Math.random() * Math.floor(80)) / 100 + 0.6) * method * method * 1.5 * 1.5 * 10;
        this.hp -= damage;
        if (this.hp <= 0)
            this.sunk();
    }

    sunk()
    {
        this.ifsunk = true;
    }
}

class Cruiser extends Ship
{
    constructor(x, y, z, ry)
    {
        //class, hp, shield, speed, rand factor, size, sensor
        super(2, 500, 50, 20, 0.7, 40, 45);

        //Initialize the properties
        this.iron_laser_radius = 3;
        this.iron_frequency = 1;
        this.laser_cooldown = 400;
        this.iron_laser_cooldown = 1000;
        this.point = 50;

        //Call the function to create the basic Geometry of the ship alone with the model
        super.createGeometry(2, './js/model/Fleet/Cruiser/scene.gltf');

        //Call the function to create the attack point of the ship
        this.createAttackPoint();

        //Set and store the ship's position in the scene
        this.setPosition(x, y, z);
        this.Geometry.rotation.y = ry;

        //Add everything into the scene
        scene.add(this.Geometry);
    }

    createAttackPoint()
    {
        //The laser attack will generate from this point
        this.iron_laser_attack_point_list.push(new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 })));
        this.iron_laser_attack_point_list[0].position.set(3, 0.5, 1);

        //Add the attack point to the object's Geometry
        this.Geometry.add(this.iron_laser_attack_point_list[0]);

        var i;
        for (i = 0; i < 5; i++)
        {
            var subcannon = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 }));
            subcannon.position.set(2, 0.5, i - 3);
            //Store each subcannon position
            this.cannon_attack_point_list.push(subcannon);
            this.Geometry.add(subcannon);
        }
    }

    /**
     * This function is used to update the cooldown of the weapon
     */
    countdown()
    {
        if (this.if_laser_attack)
        {
            var wtf = Math.floor(Math.random() * Math.floor(4));
            this.laser_cooldown -= wtf;
            this.iron_laser_cooldown -= wtf;
            if (this.laser_cooldown <= 0)
            {
                this.if_laser_attack = false;
                this.laser_cooldown = 400;
            }
            if (this.iron_laser_cooldown <= 0)
            {
                this.if_iron_attack = false;
                this.iron_laser_cooldown = 1000;
            }
        }
    }
}

class Destroyer extends Ship
{
    laser_cooldown;

    if_laser_attack;

    constructor(x, y, z, ry)
    {
        //class, hp, shield, speed, rand factor, size, sensor
        super(1, 200, 25, 35, 0.4, 10, 20);

        //Initialize the properties
        this.if_laser_attack = false;
        this.laser_cooldown = 50;
        this.point = 25;

        //Call the function to create the basic Geometry of the ship alone with the model
        this.createGeometry(1, './js/model/Fleet/Destroyer/scene.gltf');

        //Call the function to create the attack point of the ship
        this.createAttackPoint();

        //Add everything into the scene
        scene.add(this.Geometry);

        //Set the ship's position in the scene
        this.setPosition(x, y, z);
        this.Geometry.rotation.y = ry;
    }

    createAttackPoint()
    {
        var i, subcannon;
        for (i = 0; i < 2; i++)
        {
            //Generate the subcannon
            subcannon = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 }));
            subcannon.position.set(3, 0, i - 1);
            this.cannon_attack_point_list.push(subcannon);
            //Add the attack point to the object's Geometry
            this.Geometry.add(subcannon);
        }
    }

    countdown()
    {
        if (this.if_laser_attack)
        {
            var wtf = Math.floor(Math.random() * Math.floor(4));
            this.laser_cooldown -= wtf;
            if (this.laser_cooldown <= 0)
            {
                this.if_laser_attack = false;
                this.laser_cooldown = 100;
            }
        }
    }
}

class laser
{
    model;
    langle;
    duration;
    size;
    color;
    constructor(pfrom, pto, lduration, ssize, scolor)
    {
        console.log("Draw Laser!");
        //Store the size of the laser
        this.size = ssize;
        this.color = scolor;

        var d = pfrom.distanceTo(pto);
        var cylinderMesh;

        // cylinder: radiusAtTop, radiusAtBottom, height, radiusSegments, heightSegments
        var edgeGeometry = new THREE.CylinderGeometry(this.size * 1.3 * 0.3, this.size * 1.3, d, 20, 1);
        var mat = new THREE.MeshLambertMaterial();
        mat.color.setHex(this.color);
        mat.emissive = new THREE.Color(this.color);
        mat.emissiveIntensity = 1000;
        mat.transparent = true;
        mat.opacity = 0.05;

        var edge = new THREE.Mesh(edgeGeometry, mat);
        cylinderMesh = new THREE.Mesh();
        cylinderMesh.add(edge);

        //Create another layer

        // cylinder: radiusAtTop, radiusAtBottom, height, radiusSegments, heightSegments
        edgeGeometry = new THREE.CylinderGeometry(this.size * 0.3, this.size, d, 20, 1);
        mat = new THREE.MeshLambertMaterial();
        mat.color.setHex(this.color);
        mat.emissive = new THREE.Color(this.color);
        mat.emissiveIntensity = 1000;

        edge = new THREE.Mesh(edgeGeometry, mat);
        cylinderMesh.add(edge);

        //Rotate the laser towards the target ship
        var quaternion = new THREE.Quaternion();
        var from = new THREE.Vector3(0, 1, 0);
        var to = new THREE.Vector3();
        to.copy(pto);
        to.sub(pfrom);
        quaternion.setFromUnitVectors(from, to);
        cylinderMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.normalize());

        //Calculate and set position of the laser based on the coordinate system
        var central = new THREE.Vector3();
        central.copy(pto);
        central.sub(pfrom);
        central.divideScalar(2);
        central.add(pfrom);
        cylinderMesh.position.copy(central);

        //Generate explosion at the end
        /*
        var new_explosion = new explosion(pto, 0.5, lduration, this.color);
        scene.add(new_explosion.Geometry);
        explosion_list.push(new_explosion);
        */

        this.model = cylinderMesh;
        this.langle = 0;
        this.duration = lduration; 
    }

    remove()
    {
        scene.remove(this.model);
    }
}

class cannon
{
    type;               //This is the type of the cannon projectile, 1 means the subcannon
    Geometry;           //This is the geometry instance of the cannon projectile

    origin;             //This is the origin of the cannon
    destination;        //This is where the object is going to
    forward_vector;     //This is the direction of the cannon projectile

    velocity;           //This is the velocity of the projectile

    /**
     * 
     * @param {int} t - The type of the cannon projectile, 1 for subcannon.
     * @param {Vector3} o - The origin point where the projectile start to move.
     * @param {Vector3} d - The destination point where the projectile stop to move.
     * @param {float} v - The velocity.
     */
    constructor(t, o, d, v)
    {
        this.type = t;

        this.origin = new THREE.Vector3().copy(o);
        this.destination = new THREE.Vector3().copy(d);
        this.velocity = v;

        if (t === 1)
        {
            // cylinder: radiusAtTop, radiusAtBottom, height, radiusSegments, heightSegments
            var edgeGeometry = new THREE.CylinderGeometry(0.02, 0.005, 1.5, 6, 1);
            var mat = new THREE.MeshLambertMaterial({ color: 0xfbff00 });
            mat.emissive = new THREE.Color(0xfbff00);
            mat.emissiveIntensity = 1000;
            mat.transparent = true;
            mat.opacity = 1.0;

            var edge = new THREE.Mesh(edgeGeometry, mat);
            this.Geometry = new THREE.Mesh();
            this.Geometry.add(edge);
        }

        this.Geometry.position.copy(o);

        //Rotate the laser towards the target ship
        var quaternion = new THREE.Quaternion();
        var from = new THREE.Vector3(0, 1, 0);
        var to = new THREE.Vector3().copy(this.destination).sub(this.origin);
        quaternion.setFromUnitVectors(from, this.destination);
        this.Geometry.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.normalize());
        //Store the forward vector
        to.normalize();
        this.forward_vector = new THREE.Vector3().copy(to);
    }
}

class explosion
{
    eangle;
    radius;
    Geometry;
    duration;
    color;

    constructor(pos, r, d, c)
    {
        this.radius = r;
        this.eangle = 0;
        this.duration = d;
        this.color = c;
        this.Geometry = new THREE.Mesh(new THREE.SphereBufferGeometry(r, 15, 15), new THREE.MeshLambertMaterial({
            color: this.color,
            transparent: true,
            opacity: 1.0,
            emissive : new THREE.Color(this.color),
            emissiveIntensity : 1000
        }));
        this.Geometry.position.copy(pos);
    }
}

function InitScene()
{
    scene = new THREE.Scene();
    var axes_helper = new THREE.AxesHelper(5);
    scene.add(axes_helper);
}

function InitCamera()
{
    //var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    //scene.add(camera);
    camera.position.set(-29, 11, -23);
    //camera.lookAt(-100, 100, 0);

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI;
    controls.minDistance = 1;
    controls.maxDistance = 100;
}

function InitRenderer()
{
    //Initialize the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });

    //Here we set the render range, which is the size of the window, which is the browser window.
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ReinhardToneMapping;

    //Enable the shadow
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    //load the background
    var loader = new THREE.CubeTextureLoader();
    //var bg = loader.load('../images/gamebg.jpg');
    //scene.background = bg;
}

function CreateEffect() 
{
    renderScene = new RenderPass(scene, camera);

    //Bloom effect
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    //Sobel effect
    effectSobel = new ShaderPass(SobelOperatorShader);
    effectSobel.uniforms['resolution'].value.x = window.innerWidth * window.devicePixelRatio;
    effectSobel.uniforms['resolution'].value.y = window.innerHeight * window.devicePixelRatio;

    //Gray effect
    var effectGrayScale = new ShaderPass(LuminosityShader);

    //Create composer
    composerOn = new EffectComposer(renderer);
    composerOn.addPass(renderScene);
    composerOn.addPass(bloomPass);
    composerOn.addPass(effectGrayScale);
    composerOn.addPass(effectSobel);

    composerOff = new EffectComposer(renderer);
    composerOff.addPass(renderScene);
    composerOff.addPass(bloomPass);
}

function AmbientLight(color)
{
    var alight = new THREE.AmbientLight(color);
    alight.intensity = 0.2;
    scene.add(alight);
}

function DirectLight(x, y, z, color, intensity)
{
    var light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);

    //Set up shadow properties for the light
    light.castShadow = true;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 2000;
    light.shadow.bias = -0.0003;

    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -80; 

    light_list.push(light);
    scene.add(light);

    var helper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(helper);
}

function PointLight(x, y, z, color, radius, intensity)
{    
    //Creating the lighting
    var light = new THREE.PointLight(color, intensity, radius);
    light.position.set(x, y, z);

    //Set up shadow properties for the light
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 1000;
    light.shadow.bias = -0.001;
    light.shadow.camera.left = -window.innerWidth / 2;
    light.shadow.camera.right = window.innerWidth / 2;
    light.shadow.camera.top = -window.innerHeight / 2;
    light.shadow.camera.bottom = window.innerHeight / 2;

    var geometry = new THREE.SphereBufferGeometry(0.3, 12, 6);
    var material = new THREE.MeshBasicMaterial({ color: color });
    material.color.multiplyScalar(intensity);
    var sphere = new THREE.Mesh(geometry, material);
    //light.add(sphere);

    var texture = new THREE.CanvasTexture(generateTexture());
    texture.magFilter = THREE.NearestFilter;
    texture.wrapT = THREE.RepeatWrapping;
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(1, 4.5);

    geometry = new THREE.SphereBufferGeometry(2, 32, 8);
    material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        alphaMap: texture,
        alphaTest: 0.5
    });
    sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    //light.add(sphere);

    // custom distance material
    
    var distanceMaterial = new THREE.MeshDistanceMaterial({
        alphaMap: material.alphaMap,
        alphaTest: material.alphaTest
    });
    sphere.customDistanceMaterial = distanceMaterial;
    //light.add(sphere);

    light_list.push(light);
    scene.add(light);    
} 

function generateTexture()
{
    var canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    var context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 1, 2, 1);
    return canvas;
}

function InitLight() {
    AmbientLight(0xffffff);
    DirectLight(800, 200, 0, 0xeba434, 3);
}

function InitObj() {
    light_list = [];
    player_ship_list = [];
    computer_ship_list = [];
    laser_list = [];
    projectile_list = [];
    explosion_list = [];

    total_point = 200;
    player_point = computer_point = 0;
}

/**
 *  This function is used to generate the computer's fleet based on total point 
 */
function InitFleet()
{
    for (computer_point = 0; computer_point <= total_point;)
    {
        //Random set ship
        var ship_type = Math.floor(Math.random() * Math.floor(2));
        var new_ship;
        //Create the ship
        if (ship_type === 0)
        {
            new_ship = new Destroyer(300, -5, -30 + computer_ship_list.length * 10, Math.PI);
        }
        else if (ship_type === 1)
        {
            new_ship = new Cruiser(300, 0, -30 + computer_ship_list.length * 10, Math.PI);
        }
        //Push the new ship into the computer's ship list
        computer_ship_list.push(new_ship);
        //Draw the ship in the scene
        scene.add(new_ship.Geometry);
        //Increase the point
        computer_point += new_ship.point;
    }
}

var Ship_control = {
    "Add Destroyer": function ()
    {
        if (player_point + 25 <= total_point)
        {
            var new_ship = new Destroyer(0, -5, -30 + player_ship_list.length * 10, 0);
            player_ship_list.push(new_ship);
            scene.add(new_ship.Geometry);
            player_point += new_ship.point;
        }
        else
        {
            console.log("Reach the limit!");
        }
    },
    "Remove Destroyer": function ()
    {
        var i;
        for (i = player_ship_list.length - 1; i > -1; i--)
        {
            if (player_ship_list[i].class === 1)
            {
                player_point -= player_ship_list[i].point;
                //Remove ship from scene
                scene.remove(player_ship_list[i].Geometry);
                player_ship_list.splice(i, 1);
                break;
            }
        }
    },
    "Add Cruiser": function ()
    {
        if (player_point + 50 <= total_point)
        {
            var new_ship = new Cruiser(0, 0, -30 + player_ship_list.length * 10, 0);
            player_ship_list.push(new_ship);
            scene.add(new_ship.Geometry);
            player_point += new_ship.point;
        }
        else
        {
            console.log("Reach the limit!");
        }
    },
    "Remove Cruiser": function ()
    {
        var i;
        for (i = player_ship_list.length - 1; i > -1; i--)
        {
            if (player_ship_list[i].class === 2)
            {
                player_point -= player_ship_list[i].point;
                //Remove ship from scene
                scene.remove(player_ship_list[i].Geometry);
                player_ship_list.splice(i, 1);
                break;
            }
        }
    },
    "Add BattleShip": function ()
    {
        bat_num++;
    },
    "Remove BattleShip": function ()
    {
        //Keep the limit of 0
        if (bat_num >= 201)
        {
            bat_num--;
        }
    },
    "Start Battle": function ()
    {
        isBattle = true;
    },
    show: function ()
    {
        des_folder.show();
    },
    hide: function ()
    {
        des_folder.hide();
    }
};

function AddGui()
{
    //Initialize the gui list
    //Create Add ship function
    gui = new GUI();

    //The destroyer setting controller
    des_folder = gui.addFolder("Player's Destroyer");
    des_folder.add(Ship_control, "Add Destroyer");
    des_folder.add(Ship_control, "Remove Destroyer");
    des_folder.open();

    //The cruiser setting controller
    cru_folder = gui.addFolder("Player's Cruiser");
    cru_folder.add(Ship_control, "Add Cruiser");
    cru_folder.add(Ship_control, "Remove Cruiser");
    cru_folder.open();

    //The battleship setting controller
    /*
    bat_folder = gui.addFolder("Player's Battleship");
    bat_folder.add(Ship_control, "Add BattleShip");
    bat_folder.add(Ship_control, "Remove BattleShip");
    bat_folder.open();
    */

    gui.add(Ship_control, "Start Battle");

    //The effect controller
    effect_folder = gui.addFolder("Effects");
    effect_folder.add(params, "Sobel_effect");
    effect_folder.open();

    gui.open();
}

/*****Status Function*****
 * Name: 
 *      checkShip
 * Usage: 
 *      Used to check the ship's status, remove from list if sunk
 * Para: 
 *      None
 * Process: 
 *      1. Modify the ship list
 * */
function checkShip()
{
    var i;
    for (i = 0; i < computer_ship_list.length; i++)
    {
        if (computer_ship_list[i].ifsunk)
        {
            scene.remove(computer_ship_list[i].Geometry);
            explosion_list.push(new explosion(computer_ship_list[i].Geometry.position, 15, 0.2));
            computer_ship_list.splice(i, 1);
        }
    }

    for (i = 0; i < player_ship_list.length; i++)
    {
        if (player_ship_list[i].ifsunk)
        {
            scene.remove(player_ship_list[i].Geometry);
            explosion_list.push(new explosion(player_ship_list[i].Geometry.position, 15, 0.2));
            player_ship_list.splice(i, 1);
        }
    }
}

/*****Status Function*****
 * Name: 
 *      checkProjectile
 * Usage: 
 *      Used to check the in-scene Projectile's status, generate explosion if reach the destination
 * Para: 
 *      None
 * Process: 
 *      1. Modify the projectile list
 *      2. Modify the projectils's mesh and position
 *      3. Modify the explosion list
 * */
function checkProjectile()
{
    var i, j, k;
    //For each projectile in the list
    for (i = 0; i < projectile_list.length; i++)
    {
        //Move the projectile, using current position add with forward vector times the velocity
        var velocity = new THREE.Vector3().copy(projectile_list[i].forward_vector);
        projectile_list[i].Geometry.position.add(velocity.multiplyScalar(projectile_list[i].velocity));
        //Check if at destination already passed using current position vector compare to the forward
        var current_direction = new THREE.Vector3().copy(projectile_list[i].destination).sub(projectile_list[i].Geometry.position);
        if (current_direction.dot(projectile_list[i].forward_vector) / (current_direction.length() * projectile_list[i].forward_vector.length()) === -1)
        {
            //If the projectile reaches the destination, react based on the type of the projectile
            if (projectile_list[i].type === 1)
            {
                //If the type is the subcannon ammo, generate an explosion
                var destination = new THREE.Vector3().copy(projectile_list[i].destination);
                var new_explosion = new explosion(destination, 1, 0.2, 0xd99400);
                scene.add(new_explosion.Geometry);
                explosion_list.push(new_explosion);
            }
            scene.remove(projectile_list[i].Geometry);
            delete projectile_list[i];
            projectile_list.splice(i, 1);
        }
    }
}

/*****Status Function*****
 * Name:
 *      checkLaser
 * Usage:
 *      Used to check the in-scene Laser Beam's status
 * Para:
 *      None
 * Process:
 *      1. Modify the Laser's mesh
 * */
function checkLaser()
{
    var i, j, k;
    //Start to check lasers
    for (i = 0; i < laser_list.length; i++)
    {
        laser_list[i].model.scale.x = laser_list[i].model.scale.z = Math.sin(laser_list[i].langle);
        laser_list[i].langle += Math.PI / (180 * laser_list[i].duration);
        if (laser_list[i].langle > Math.PI)
        {
            scene.remove(laser_list[i].model);
            laser_list.splice(i, 1);
        }
    }
}

/*****Status Function*****
 * Name:
 *      checkExplosion
 * Usage:
 *      Used to check the in-scene Explosion's status
 * Para:
 *      None
 * Process:
 *      1. Modify the explosion's mesh
 *      2. Modify the explosion list
 * */
function checkExplosion()
{
    var i, j, k;
    //Start to check lasers
    for (i = 0; i < explosion_list.length; i++)
    {
        explosion_list[i].Geometry.scale.x = explosion_list[i].Geometry.scale.y = explosion_list[i].Geometry.scale.z = Math.sin(explosion_list[i].eangle);
        explosion_list[i].eangle += Math.PI / (180 * explosion_list[i].duration);
        if (explosion_list[i].eangle > Math.PI)
        {
            scene.remove(explosion_list[i].Geometry);
            delete explosion_list[i];
            explosion_list.splice(i, 1);
        }
    }
}

function createLaser()
{

}

/*****Main Function*****
 * Name:
 *      gameProcess
 * Usage:
 *      Used to play each step in one cycle during the battle phase
 * Para:
 *      None
 * Process:
 *      1. Basic ship's AI
 *      2. Perform all the checks
 * */
function gameProcess()
{
    var i, j, k, target;

    for (i = 0; i < player_ship_list.length; i++)
    {
        //Select the target ship
        target = player_ship_list[i].selectTarget(computer_ship_list);

        //Check if perform the cannon attack
        var coordinates = player_ship_list[i].laserAttack(computer_ship_list[target]);
        if (coordinates)
        {
            for (j = 0; j < coordinates.length; j++)
            {
                var new_cannon_projectile = new cannon(1, coordinates[j][0], coordinates[j][1], 1);
                scene.add(new_cannon_projectile.Geometry);
                projectile_list.push(new_cannon_projectile);
            }

        }

        //Check if perform iron attack
        coordinates = player_ship_list[i].ironAttack(computer_ship_list[target]);
        if (coordinates)
        {
            var new_laser = new laser(coordinates[0], coordinates[1], 2, 0.05, 0x00c3ff);
            scene.add(new_laser.model);
            laser_list.push(new_laser);
        }

        //Call the cool down function
        player_ship_list[i].countdown();
    }

    for (i = 0; i < computer_ship_list.length; i++)
    {
        //Select the target ship
        target = computer_ship_list[i].selectTarget(player_ship_list);

        //Check if perform the cannon attack
        coordinates = computer_ship_list[i].laserAttack(player_ship_list[target]);
        if (coordinates)
        {
            for (j = 0; j < coordinates.length; j++)
            {
                new_cannon_projectile = new cannon(1, coordinates[j][0], coordinates[j][1], 1);
                scene.add(new_cannon_projectile.Geometry);
                projectile_list.push(new_cannon_projectile);
            }

        }

        //Check if perform iron attack
        coordinates = computer_ship_list[i].ironAttack(player_ship_list[target]);
        if (coordinates) 
        {
            console.log(coordinates);
            new_laser = new laser(coordinates[0], coordinates[1], 2, 0.05, 0xff0000);
            scene.add(new_laser.model);
            laser_list.push(new_laser);
        }

        //Call the cool down function
        computer_ship_list[i].countdown();
    }

    //eship_list[0].ironAttack();

    checkShip();

    checkLaser();

    checkProjectile();

    checkExplosion();

    
}

function Animate()
{
    scene.updateMatrixWorld();
    //If start the battle
    if (isBattle)
    {
        des_folder.hide();
        cru_folder.hide();
        gameProcess();
    }

    //This function used to tell the webGL to update the specific function before next phase
    requestAnimationFrame(Animate);
    renderer.render(scene, camera);

    //Update the angle
    angle += Math.PI / 180;
    var angleI = angle + Math.PI;

    //This is the control of the effect section
    if (params.Sobel_effect === true)
        composerOn.render();
    else
        composerOff.render();

    //This is window's resize function
    window.onresize = function ()
    {
        var width = window.innerWidth;
        var height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        if (params.Sobel_effect === true)
            composerOn.setSize(width, height);
        else
            composerOff.setSize(width, height);
    };
}

InitRenderer();
InitScene();
InitCamera();
InitObj();
InitLight();
CreateEffect();
InitFleet();
AddGui();

Animate();

function sleep(miliseconds)
{
    var currentTime = new Date().getTime();

    while (currentTime + miliseconds >= new Date().getTime())
    { };
}