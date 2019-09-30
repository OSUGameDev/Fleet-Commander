export class laser
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
}

export class cannon
{
    type;               //This is the type of the cannon projectile, 1 means the subcannon

    Geometry;           //This is the geometry instance of the cannon projectile

    origin;             //This is the origin of the cannon
    destination;        //This is where the object is going to
    forward_vector;     //This is the direction of the cannon projectile

    velocity;           //This is the velocity of the projectile

    if_target_ship;
    target_group;
    target_pos;

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

        /*
        this.call_back = function ()
        {
            console.log("Call back Function!");
        };
        */

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

    setHit(ship_group, ship_position)
    {
        this.if_target_ship = true;
        this.target_group = ship_group;
        this.target_pos = ship_position;
    }
}

export class explosion
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
            emissive: new THREE.Color(this.color),
            emissiveIntensity: 1000
        }));
        this.Geometry.position.copy(pos);
    }
}