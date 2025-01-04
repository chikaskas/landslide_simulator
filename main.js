let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");
context.lineWidth = 15;
let balls = [];
const pi = Math.PI;
function make_2d_vector(x, y) {
    vector = {}

    vector.x = x
    vector.y = y
    vector.get_magitude = function() {return (vector.x**2 + vector.y**2)**0.5}
    vector.get_unit = function() {return make_2d_vector(vector.x/vector.get_magitude(), vector.y/vector.get_magitude())}

    return vector
}

function new_ball(position, velocity, radius, density, friction, color) {
    const ball = {};

    ball.position = position //px
    ball.angle = 0 //rad
    ball.radius = Number(radius) //px
    ball.mass = Number(density*ball.radius*ball.radius) //kg
    ball.color = String(color) //#rrggbb
    ball.lubrication = 1- Number(friction) //0-1
    ball.velocity = velocity //px/s
    ball.angular_velocity = 0 //rad/s
    ball.touching = []

    ball.update = function(time) {
        ball.position.x += ball.velocity.x * time;
        ball.position.y += ball.velocity.y * time;
        ball.angle += ball.angular_velocity * time;
        ball.position.y = Math.max(ball.radius, Math.min(1024-ball.radius, ball.position.y));
        ball.position.x = Math.max(ball.radius, Math.min(2560-ball.radius, ball.position.x));
    }

    ball.draw = function() {

        context.fillStyle = ball.color;
        const rgb = [
            parseInt(ball.color.slice(0, 2), 16),
            parseInt(ball.color.slice(2, 4), 16),
            parseInt(ball.color.slice(4, 6), 16)
        ];
        const inverted = `#${(255 - rgb[0]).toString(16).padStart(2, '0')}${(255 - rgb[1]).toString(16).padStart(2, '0')}${(255 - rgb[2]).toString(16).padStart(2, '0')}`;
        context.strokeStyle = inverted;

        //circle
        context.beginPath();
        context.arc(ball.position.x, ball.position.y, ball.radius, 0, 2 * pi);
        context.fill();
        context.closePath();
    }

    ball.bounce_off = function(other_ball, lubrication) {

        let = this_ball = JSON.parse(JSON.stringify(ball))

        let normal_direction = make_2d_vector(other_ball.position.x - this_ball.position.x, other_ball.position.y - this_ball.position.y).get_unit();
        let tangent_direction = make_2d_vector(normal_direction.y, -normal_direction.x);
        {
            let v = this_ball.velocity
            let d = normal_direction
            if (d.x == 0) {d.x = 0.001}
            let a = (v.x + v.y * d.y / d.x) / (d.x + d.y * d.y / d.x)
            let b = (a * d.y - v.y) / d.x
            this_ball.normal_magnitude = a
            this_ball.tangent_magnitude = b*lubrication
        }
        {
            let v = other_ball.velocity
            let d = normal_direction
            let a = (v.x + v.y * d.y / d.x) / (d.x + d.y * d.y / d.x)
            let b = (a * d.y - v.y) / d.x
            other_ball.normal_magnitude = a
            other_ball.tangent_magnitude = b
        }
        {
            let a = other_ball.mass;
            let b = this_ball.mass;
            let c = other_ball.normal_magnitude;
            let d = this_ball.normal_magnitude;
            let h = a**2 * c**2 + 2*a*b*c*d + b**2 * d**2;
            let i = b**2 + a*b;
            let j = -2*a*b*c - 2*b**2*d;
            let k = h - 0.5*(a**2 * c**2 + a*b*d**2);
            let dif = Math.max(0, j**2 - 4*i*k);
            let y = (-j + Math.sqrt(dif)) / (2*i);
            let z = (-j - Math.sqrt(dif)) / (2*i);
            if (Math.abs(Math.abs(y)-Math.abs(d)) < Math.abs(Math.abs(z)-Math.abs(d))) {
                this_ball.normal_magnitude = z;
            }
            else {
                this_ball.normal_magnitude = y;
            }
            this_ball.normal_magnitude = 0
        }
        ball.velocity.x = this_ball.normal_magnitude * normal_direction.x + this_ball.tangent_magnitude * tangent_direction.x;
        ball.velocity.y = this_ball.normal_magnitude * normal_direction.y + this_ball.tangent_magnitude * tangent_direction.y;
    }
    
    balls.push(ball);
    return ball;
}

const time_input = document.getElementById("time_speed");
const gravity_input = document.getElementById("gravity");
const frame_rate_display = document.getElementById("frame_rate");
const friction_input = document.getElementById("friction");
const shake_input = document.getElementById("shake");
function run_frame() {
    let time_multiplier = 1;
    const shake_speed = Number(shake_input.value);

    //frame rate handling
    current_frame_time = Date.now();
    time_passed = (current_frame_time - last_frame_time)/1000;
    last_frame_time = current_frame_time;
    frame_rate_display.innerHTML = Math.round(1/time_passed);

    const lubrication = 1- Number(friction_input.value)

    for (let index1 = 0; index1 < balls.length; index1++) {
        ball1 = balls[index1];
        for (let index2 = 0; index2 < balls.length; index2++) {
            ball2 = balls[index2];

            if (index1 === index2) {continue;}

            //bounce
            says_touching = ball2.touching.includes(index1) || ball1.touching.includes(index2);
            actually_touching = (ball1.position.x - ball2.position.x)**2 + (ball1.position.y - ball2.position.y)**2 < (ball1.radius + ball2.radius)**2;
            
            if (says_touching !== actually_touching) {
                if (actually_touching) {
                    ball1.touching.push(index2);
                    ball2.touching.push(index1);
                    ball1_copy = JSON.parse(JSON.stringify(ball1))
                    ball2_copy = JSON.parse(JSON.stringify(ball2))
                    ball1.bounce_off(ball2_copy, lubrication);
                    ball2.bounce_off(ball1_copy, lubrication);
                }
                if (says_touching) {
                    ball1.touching.splice(ball1.touching.indexOf(index2), 1);
                    ball2.touching.splice(ball2.touching.indexOf(index1), 1);
                }
            }

            // Calculate the actual distance between the centers
            const actualDistance = Math.sqrt(
                (ball2.position.x - ball1.position.x) ** 2 +
                (ball2.position.y - ball1.position.y) ** 2
            );
            
            // The minimum distance to prevent overlap
            const minDistance = ball1.radius + ball2.radius;
            
            if (actualDistance < minDistance) {
                // Calculate the direction from ball2 to ball1
                const direction = make_2d_vector(
                ball1.position.x - ball2.position.x,
                ball1.position.y - ball2.position.y
                ).get_unit();
            
                // Calculate the overlap distance
                const overlap = minDistance - actualDistance;
            
                // Split the displacement equally between the two balls
                const adjustment = overlap / 2;
            
                // Move ball1 and ball2 in opposite directions
                ball1.position.x += direction.x * adjustment;
                ball1.position.y += direction.y * adjustment;
            
                ball2.position.x -= direction.x * adjustment;
                ball2.position.y -= direction.y * adjustment;
            }
        }
    }

    const position = last_mouse_position
    const radius = Number(inputs[0].value);
    let availabe = true;

    context.clearRect(0, 0, 2560, 1024);
    for (let index = 0; index < balls.length; index++) {

        ball = balls[index];

        ball.velocity.y += Number(gravity_input.value)*time_passed;

        ball.velocity.x += shake_speed*time_passed*(Math.random() - 0.5);
        ball.velocity.y += shake_speed*time_passed*(Math.random() - 0.5);

        if (make_2d_vector(position.x - ball.position.x, position.y - ball.position.y).get_magitude() < radius+ball.radius) {availabe = false;}

        if (ball.position.y - ball.radius <= 0 || ball.position.y + ball.radius >= 1024) {ball.velocity.y *= -0.5;}

        if (ball.position.x + ball.radius >= 2048 || ball.position.x - ball.radius <= 0) {ball.velocity.x *= -0.5;}

        ball.draw();
        ball.update(time_passed*time_multiplier);
    }
    if (isFinite(position.x + position.y) && availabe) {
        const posi = JSON.parse(JSON.stringify(position));
        new_ball(posi, make_2d_vector(0, 0), radius, inputs[1].value, inputs[2].value, inputs[3].value);
    }
    requestAnimationFrame(run_frame);
}

let inputs = document.getElementsByClassName("input");
let labels = document.getElementsByClassName("dynamic");
for (let i = 0; i < inputs.length; i++) {
    inputs[i].oninput = function() {
        labels[i].innerHTML = inputs[i].value;
    }
}

let last_mouse_position = false;
canvas.addEventListener("mousedown", function(event){
    last_mouse_position = make_2d_vector(event.clientX/canvas.clientWidth*2560, event.clientY/canvas.clientHeight*1024)
})
canvas.addEventListener("mouseup", function(event){last_mouse_position = false;})

canvas.addEventListener("mousemove", function(event){
    if (!last_mouse_position) {return;}
    last_mouse_position = {x: event.clientX/canvas.clientWidth*2560, y: event.clientY/canvas.clientHeight*1024};
})

let last_frame_time = Date.now();
run_frame();