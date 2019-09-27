class Ship
{
    class;
    id;
    hp;
    shield;
    speed;
    dps;
    model;
    Geometry;
    position;

    ifsunk;

    scene;

    constructor(sclass, sid, shp, sshield, sspeed, sdps, factor)
    {
        this.class = sclass;
        this.id = sid;
        this.hp = shp;
        this.shield = sshield;
        this.speed = sspeed;
        this.dps = sdps;
        this.ifsunk = false;

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

    receiveAttack(method)
    {
        var Aiming;
        if (method === 1)        //If the subcannon
            Aiming = 100;
        else if (method === 2)       //If the iron cannon attack
            Aiming = 70;

        //Calculate the result of the attack
        var hit = Math.floor(Math.random() * Math.floor(Aiming - this.speed));
        hit /= Aiming;
        hit *= this.class;
        //Check if hit
        if (hit >= 0.5)
        {
            //Calculate the damage
            var damage = (Math.floor(Math.random() * Math.floor(80)) / 100 + 0.6) * method * method * 1.5 * 1.5 * 10;
            this.hp -= damage;
            console.log(this.class + ' been hit by method ' + method + ' with rest hp of ' + this.hp);
            //Check the health
            if (this.hp <= 0)
                this.sunk();
            return true;
        }
        else
            return false;
    }

    sunk()
    {
        this.ifsunk = true;
    }
}

export class Cruiser extends Ship
{
    laser;                  //This is the main cannon of the Cruiser class ship
    laser_cooldown;         //This is the cool down for the laser attack
    cannon;                 //This is the sub cannon of Cruiser class ship
    missile;

    iron_factor;            //This is the factor that affect the radius of the iron cannon's laser (visual effect)
    iron_frequency;         //This is the factor that affect the frequency of the iron cannon attack

    if_iron_attack;         //If the iron cannon currently firing
    if_laser_attack;        //If the laser cannon currently firing
    if_missile_attack;      //If the missile current launching

    iron_attack;            //This was used to store the laser model when perform iron cannon attack

    constructor(x, y, z, ry, sid)
    {
        //class, id, hp, shield, speed, dps, rand factor
        super(2, sid, 5000000, 50, 20, 25, 0.7);

        //Initialize the properties
        this.cannon = [];
        this.iron_factor = 3;
        this.iron_frequency = 1;
        this.laser_cooldown = 400;
        this.point = 50;

        this.if_iron_attack = this.if_laser_attack = this.if_missile_attack = false;

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
        this.laser = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 }));
        this.laser.position.set(3, 0.5, 1);

        //Add the attack point to the object's Geometry
        this.Geometry.add(this.laser);

        var i;
        for (i = 0; i < 5; i++)
        {
            var subcannon = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 }));
            subcannon.position.set(2, 0.5, i - 3);
            //Store each subcannon position
            this.cannon.push(subcannon);
            this.Geometry.add(subcannon);
        }
    }

    laserAttack(side)
    {
        //Check if the attack could be performed
        if (!this.if_laser_attack && !this.ifsunk)
        {
            //Perform the attack
            this.laserAttackStart(side);
            return true;
        }
    }

    laserAttackStart(side)
    {
        //Randomly select the target
        var target, tship;
        if (side === 0)    //If computer
        {
            target = Math.floor(Math.random() * Math.floor(ship_list.length));
            tship = ship_list[target];
        }
        else if (side === 1)   //If player
        {
            target = Math.floor(Math.random() * Math.floor(eship_list.length));
            tship = eship_list[target];
        }
        if (!tship.ifsunk)
        {
            var i;
            for (i = 0; i < this.cannon.length; i++)
            {
                //Since the cannon's position was stored as local position, need to call world position here
                scene.updateMatrixWorld();
                var origin = new THREE.Vector3();
                this.cannon[i].getWorldPosition(origin);

                //Check if hit the target
                var destination, type;
                if (tship.receiveAttack(1))
                {
                    destination = new THREE.Vector3().copy(tship.Geometry.position);
                }
                else
                {
                    var randy = Math.floor(Math.random() * Math.floor(2)) - 1;
                    var randz = Math.floor(Math.random() * Math.floor(2)) - 1;
                    destination = new THREE.Vector3(0, randy, randz).add(tship.Geometry.position);
                }
                projectile_list.push(new cannon(1, origin, destination, 0.4));
            }
            this.if_laser_attack = true;
        }
    }

    ironAttack(side)
    {
        //Check if ship is in the attacking mode
        if (!this.if_iron_attack && !this.ifsunk)
        {
            //Check if the ship will perform the attack
            var chance = Math.floor(Math.random() * Math.floor(1000));
            //The ship only have 2% chance per frame to perform the attack
            if (chance > 980)
            {
                this.ironAttackStart(side);
                return true;
            }
        }
        else
            return false;
    }

    ironAttackStart(side)
    {
        //Randomly select the target
        var target, tship;
        if (side === 0)    //If computer
        {
            target = Math.floor(Math.random() * Math.floor(ship_list.length));
            tship = ship_list[target];
        }
        else if (side === 1)   //If player
        {
            target = Math.floor(Math.random() * Math.floor(eship_list.length));
            tship = eship_list[target];
        }
        if (!tship.ifsunk)
        {
            //Check if the laser hit the target
            if (tship.receiveAttack(2))
                this.iron_attack = new laser(this, tship, 1);
            else
                this.iron_attack = new laser(this, tship, 0);

            this.if_iron_attack = true;
        }

    }

    ironAttackStop()
    {
        this.iron_attack.remove();
        delete this.iron_attack;
        this.if_iron_attack = false;
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
                this.laser_cooldown = 400;
            }
        }
    }
}

export class Destroyer extends Ship
{

    laser;

    constructor(x, y, z, ry, sid)
    {
        //class, id, hp, shield, speed, dps, rand factor
        super(1, sid, 200, 25, 35, 13, 0.4);

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
        //The laser attack will generate from this point
        this.laser = new THREE.Mesh(new THREE.SphereBufferGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.2 }));
        this.laser.position.set(3, 0, 0);

        //Add the attack point to the object's Geometry
        this.Geometry.add(this.laser);
    }
}

export class laser
{
    from;
    to;
    model;
    langle;
    constructor(ship_from, ship_to, hit)
    {
        //Update the world coordinates
        scene.updateMatrixWorld();

        var pfrom = new THREE.Vector3();
        var pto = new THREE.Vector3();

        ship_from.laser.getWorldPosition(pfrom);
        ship_to.Geometry.getWorldPosition(pto);
        //If missed
        if (hit === 0)
        {
            //Calculate the shifting factor
            var shifty = Math.floor(Math.random() * Math.floor(4)) - 2;
            var shiftx = Math.floor(Math.random() * Math.floor(4)) - 2;
            pto.set(pto.x + shiftx, pto.y + shifty, pto.z);
        }

        var d = pfrom.distanceTo(pto);
        var cylinderMesh;

        // cylinder: radiusAtTop, radiusAtBottom, height, radiusSegments, heightSegments
        var edgeGeometry = new THREE.CylinderGeometry(0.05, 0.05, d, 20, 1);
        var mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        mat.emissive = new THREE.Color(0xff0000);
        mat.emissiveIntensity = 1000;
        mat.transparent = true;
        mat.opacity = 0.05;

        var edge = new THREE.Mesh(edgeGeometry, mat);
        cylinderMesh = new THREE.Mesh();
        cylinderMesh.add(edge);

        //Create another layer

        // cylinder: radiusAtTop, radiusAtBottom, height, radiusSegments, heightSegments
        edgeGeometry = new THREE.CylinderGeometry(0.02, 0.02, d, 20, 1);
        mat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        mat.emissive = new THREE.Color(0xff0000);
        mat.emissiveIntensity = 1000;

        edge = new THREE.Mesh(edgeGeometry, mat);
        cylinderMesh.add(edge);

        scene.add(cylinderMesh);

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

        this.from = ship_from;
        this.to = ship_to;
        this.model = cylinderMesh;
        this.langle = 0;
    }

    remove()
    {
        scene.remove(this.model);
    }
}

export class cannon
{
    type;               //This is the type of the cannon projectile, 1 means the subcannon
    Geometry;           //This is the geometru instance of the cannon projectile
    forward_vector;     //This is the direction of the cannon projectile
    origin;             //This is the origin of the cannon
    destination;        //This is where the object is going to
    velocity;              //This is the velocity of the projectile

    // parameter: type, forward vector, speed
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

            scene.add(this.Geometry);
        }

        this.Geometry.position.copy(o);

        //Rotate the laser towards the target ship
        var quaternion = new THREE.Quaternion();
        var from = new THREE.Vector3(0, 1, 0);
        var to = new THREE.Vector3().copy(this.destination).sub(this.origin);
        quaternion.setFromUnitVectors(from, this.destination);
        this.Geometry.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.normalize());
        //Store the forward vector
        this.forward_vector = new THREE.Vector3().copy(to.normalize());
    }
}

export class explosion
{
    eangle;
    radius;
    Geometry;
    duration;

    constructor(pos, r, d)
    {
        this.radius = r;
        this.eangle = 0;
        this.duration = d;
        this.Geometry = new THREE.Mesh(new THREE.SphereBufferGeometry(r, 15, 15), new THREE.MeshLambertMaterial({
            color: 0xeaff00,
            transparent: true,
            opacity: 0.8,
            emissive : new THREE.Color(0xeaff00),
            emissiveIntensity : 1000
        }));
        this.Geometry.position.copy(pos);
        scene.add(this.Geometry);
    }
}

