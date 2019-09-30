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

    if_in_scene;        //The flag shows the existance of the ship in the scene

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

        this.if_in_scene = false;
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

            //Make the selection based on hp but make some varity
            var rand = Math.floor(Math.random() * 100);
            if (target_ship_hp < min)
            {
                min = target_ship_hp;
                if (rand < 85)
                    target = i;
            }
            else if (target_ship_hp === min)
            {
                if (rand < 50)
                    target = i;
            }
            else
            {
                if (rand < 20)
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
        //Check if the target ship is undefined
        if (target_ship === undefined)
            return false;

        if (!target_ship.ifsunk)
        {
            var i, hit, random_error_x, random_error_y, random_error_z, destination;
            var result = [];
            hit = false;
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
                    hit = true;
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
                subresult.push(hit);
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
        if (!this.if_iron_attack && !this.ifsunk)
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
        //Check if the ship is undefined
        if (target_ship === undefined)
            return false;

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
        var damage = (Math.floor(Math.random() * Math.floor(80)) / 100 + 1) * method * method * 1.5 * 1.5 * 10;
        this.hp -= damage;
        if (this.hp <= 0)
            this.sunk();
    }

    sunk()
    {
        this.ifsunk = true;
    }
}

export class Cruiser extends Ship
{
    constructor(x, y, z, ry)
    {
        //class, hp, shield, speed, rand factor, size, sensor
        super(2, 5000, 50, 20, 0.7, 40, 45);

        //Initialize the properties
        this.iron_laser_radius = 3;
        this.iron_frequency = 1;
        this.laser_cooldown = 300;
        this.iron_laser_cooldown = 600;
        this.point = 50;

        //Call the function to create the basic Geometry of the ship alone with the model
        super.createGeometry(2, './js/model/Fleet/Cruiser/scene.gltf');

        //Call the function to create the attack point of the ship
        this.createAttackPoint();

        //Set and store the ship's position in the scene
        this.setPosition(x, y, z);
        this.Geometry.rotation.y = ry;
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
                this.laser_cooldown = 300;
            }
            if (this.iron_laser_cooldown <= 0)
            {
                this.if_iron_attack = false;
                this.iron_laser_cooldown = 600;
            }
        }
    }
}

export class Destroyer extends Ship
{
    laser_cooldown;

    if_laser_attack;

    constructor(x, y, z, ry)
    {
        //class, hp, shield, speed, rand factor, size, sensor
        super(1, 2000, 25, 35, 0.4, 10, 20);

        //Initialize the properties
        this.if_laser_attack = false;
        this.laser_cooldown = 300;
        this.point = 25;

        //Call the function to create the basic Geometry of the ship alone with the model
        this.createGeometry(1, './js/model/Fleet/Destroyer/scene.gltf');

        //Call the function to create the attack point of the ship
        this.createAttackPoint();

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
                this.laser_cooldown = 300;
            }
        }
    }
}