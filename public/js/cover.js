import { GUI } from '../three.js/examples/jsm/libs/dat.gui.module.js';

import { EffectComposer } from '../three.js/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../three.js/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from '../three.js/examples/jsm/postprocessing/ShaderPass.js';

import { UnrealBloomPass } from '../three.js/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LuminosityShader } from '../three.js/examples/jsm/shaders/LuminosityShader.js';
import { SobelOperatorShader } from '../three.js/examples/jsm/shaders/SobelOperatorShader.js';
import { OrbitControls } from '../three.js/examples/jsm/controls/OrbitControls.js';
import { Quaternion, Object3D, Vector3 } from '../three.js/src/Three.js';

import { Cruiser, Destroyer } from './module/ships.js';
import { laser, cannon, explosion } from './module/effects.js';

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

function InitScene()
{
    scene = new THREE.Scene();
    var axes_helper = new THREE.AxesHelper(5);
    //scene.add(axes_helper);
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

    total_point = 800;
    player_point = computer_point = 0;
}

/**
 *  This function is used to generate the computer's fleet based on total point 
 */
function InitFleet()
{
    for (computer_point = 0; computer_point < total_point;)
    {
        //Random set ship
        var ship_type = Math.floor(Math.random() * Math.floor(2));
        var new_ship = false;
        //Create the ship
        if (ship_type === 0)
        {
            if (computer_point + 25 <= total_point)
                new_ship = new Destroyer(300, -5, -30 + computer_ship_list.length * 10, Math.PI);
        }
        else if (ship_type === 1)
        {
            if (computer_point + 50 <= total_point)
                new_ship = new Cruiser(300, 0, -30 + computer_ship_list.length * 10, Math.PI);
        }
        if (new_ship)
        {
            //Push the new ship into the computer's ship list
            computer_ship_list.push(new_ship);
            //Draw the ship in the scene
            scene.add(new_ship.Geometry);
            //Increase the point
            computer_point += new_ship.point;
        }
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


function drawShips()
{
    var i;
    for (i = 0; i < player_ship_list.length; i++)
    {
        if (!player_ship_list[i].if_in_scene)
            scene.add(player_ship_list[i].Geometry);
    }
    for (i = 0; i < computer_ship_list.length; i++)
    {
        if (!computer_ship_list[i].if_in_scene)
            scene.add(computer_ship_list[i].Geometry);
    }
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
    var i, new_explosion;
    for (i = 0; i < computer_ship_list.length; i++)
    {
        //console.log("Computer list: " + i + " hp is: " + computer_ship_list[i].hp);
        if (computer_ship_list[i].ifsunk)
        {
            scene.remove(computer_ship_list[i].Geometry);
            new_explosion = new explosion(computer_ship_list[i].Geometry.position, 15, 2, 0xFF8900);
            scene.add(new_explosion.Geometry);
            explosion_list.push(new_explosion);
            computer_ship_list.splice(i, 1);
        }
    }

    for (i = 0; i < player_ship_list.length; i++)
    {
        console.log("Player list: " + i + " hp is: " + player_ship_list[i].hp);
        if (player_ship_list[i].ifsunk)
        {
            scene.remove(player_ship_list[i].Geometry);
            new_explosion = new explosion(player_ship_list[i].Geometry.position, 15, 2, 0xFF8900);
            scene.add(new_explosion.Geometry);
            explosion_list.push(new_explosion);
            player_ship_list.splice(i, 1);
        }
    }

    //Check if game over
    if (player_ship_list.length === 0 && computer_ship_list.length === 0)
    {
        console.log("Draw!");
        isBattle = false;
    }
    else if (player_ship_list.length === 0)
    {
        console.log("Computer win!");
        isBattle = false;
    }
    else if (computer_ship_list.length === 0)
    {
        console.log("Player win!");
        isBattle = false;
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
            //After reach the destination, check if the ship been hit
            if (projectile_list[i].if_target_ship)
            {
                var tgroup = projectile_list[i].target_group;
                var tpos = projectile_list[i].target_pos;
                if (tgroup === 0)
                {
                    if (tpos < computer_ship_list.length && !computer_ship_list[tpos].ifsunk)
                        computer_ship_list[projectile_list[i].target_pos].receiveDamage(2);
                }
                else if (tgroup === 1)
                {
                    if (tpos < player_ship_list.length && !player_ship_list[tpos].ifsunk)
                        player_ship_list[projectile_list[i].target_pos].receiveDamage(2);
                }
            }
            //Remove the projectile from the scene and list
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
    //Check the ship status
    checkShip();

    //Check if the game over
    if (!isBattle)
        return;

    var i, j, k, target, ray;

    for (i = 0; i < player_ship_list.length; i++)
    {
        //Select the target ship
        target = player_ship_list[i].selectTarget(computer_ship_list);

        //Check if perform the cannon attack, and draw the cannon
        var coordinates = player_ship_list[i].laserAttack(computer_ship_list[target]);
        if (coordinates)
        {
            for (j = 0; j < coordinates.length; j++)
            {
                var new_cannon_projectile = new cannon(1, coordinates[j][0], coordinates[j][1], 2);
                //Check if hit the ship
                if (coordinates[j][2])
                    new_cannon_projectile.setHit(0, target);
                scene.add(new_cannon_projectile.Geometry);
                projectile_list.push(new_cannon_projectile);
            }

        }

        //Check if perform iron attack
        coordinates = player_ship_list[i].ironAttack(computer_ship_list[target]);
        if (coordinates)
        {
            var new_laser = new laser(coordinates[0], coordinates[1], 2, 0.05, 0x00c3ff);
            computer_ship_list[target].receiveDamage(5);
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
                new_cannon_projectile = new cannon(1, coordinates[j][0], coordinates[j][1], 2);
                if (coordinates[j][2])
                    new_cannon_projectile.setHit(1, target);
                scene.add(new_cannon_projectile.Geometry);
                projectile_list.push(new_cannon_projectile);
            }

        }

        //Check if perform iron attack
        coordinates = computer_ship_list[i].ironAttack(player_ship_list[target]);
        if (coordinates) 
        {
            new_laser = new laser(coordinates[0], coordinates[1], 2, 0.05, 0xff0000);
            player_ship_list[target].receiveDamage(5);
            scene.add(new_laser.model);
            laser_list.push(new_laser);
        }

        //Call the cool down function
        computer_ship_list[i].countdown();
    }

    checkLaser();

    checkProjectile();

    checkExplosion();   
}

function Animate()
{
    //Update the world matrix
    scene.updateMatrixWorld();

    //Check if all the obejct was draw
    drawShips();

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