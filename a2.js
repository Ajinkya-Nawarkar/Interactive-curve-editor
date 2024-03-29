// A2 Rasterization Code
// Name: Ajinkya Nawarkar, Noah Bare
// NetId: an839

// Goal: 
// - Implement Chaikin and Bezier Curve as a part of the final project
// - Implement interactive addition and removal of control points

// HTML element we need
const canvas = document.getElementById("canvas");
const help = document.getElementById("help");
const sizer = document.getElementById("size");

// Some variables
const color = [0, 0, 0, 255];
const color2 = [255, 0, 0, 255];
const customcolor = [0, 0, 255, 255];
var EL_type = "chaikin";
var EL_new_point = [];
var EL_step_size = 11;
var EL_show_lines = "true";

let drawPointsGPU = undefined;
let drawLineGPU = undefined;

let points = [];
let circle_tolerance = 5;

// Load regl module into the canvs element on the page
// For this assignment, we turn off antialiasing (so we do it manually) and
// auto clearing the draw buffer (so our drawing is preserved between calls).
const regl = createREGL({canvas: canvas, 
                         attributes: {antialias: false, 
                                      depth: false,
                                      preserveDrawingBuffer: true}});

// Two data elements loaded from "web server": the two shader programs
let vertexSource = undefined;
let fragmentSource = undefined;

// Set up two Fetch calls for the resources and process accordingly. 
// Each one calls the init() function; this function only completes when
// all resources are loaded. Always re-fetch so caching doesn't hurt us
function load()
{
    fetch('a2.vert.glsl', {cache: "no-store"})
    .then(function(response) {
        return response.text();
    })
    .then(function(txt) {
        vertexSource = txt;
        init();
    });

    fetch('a2.frag.glsl', {cache: "no-store"})
    .then(function(response) {
        return response.text();
    })
    .then(function(txt) {
        fragmentSource = txt;
        init();
    });

    function setMousePos(event){
        //hello
        EL_new_point = [window.devicePixelRatio * event.pageX, window.devicePixelRatio * ((canvas.clientHeight + 67) - event.pageY)];
        click_interaction(EL_type, EL_new_point, EL_step_size);
        console.log(EL_new_point);
        EL_new_point = [];
    }
    function setType(event){
        EL_step_size = parseInt(document.getElementById('step').value);
        if( EL_type === "bezier"){
            EL_type = "chaikin";
            console.log("Step size: " + EL_step_size);
        }
        else {
            EL_type = "bezier";
            EL_step_size = EL_step_size + 300;
            console.log("Step size: " + EL_step_size);
        }
        EL_new_point = [];
        click_interaction(EL_type, EL_new_point, EL_step_size);
        console.log(EL_type);
    }
    function setStepSize(event){
        EL_step_size = parseInt(document.getElementById('step').value);
        if( EL_type === "bezier"){
            EL_step_size = EL_step_size * 50;
            console.log("Step size: " + EL_step_size);

        }
        EL_new_point = [];
        click_interaction(EL_type, EL_new_point, EL_step_size);
        console.log(EL_step_size);
    }
    function setLines(event){
        if(EL_show_lines === 'true'){
            EL_show_lines = 'false';
        }
        else{
            EL_show_lines = 'true';
        }
        click_interaction(EL_type, EL_new_point, EL_step_size);
    }

    document.getElementById("canvas").addEventListener('click', setMousePos, true);
    document.getElementById('chaikin').addEventListener('click', setType, true);
    document.getElementById('bezier').addEventListener('click', setType, true);
    document.getElementById('step').addEventListener('click', setStepSize, true);
    document.getElementById('showLines').addEventListener('click', setLines, true);

}

// The intialization function. Checks for all resources before continuing
function init()
{
    // Is everything loaded?
    if(vertexSource === undefined 
        || fragmentSource === undefined)
        return;

    // regl draw commands for the assignment. We have two:
    // - reglPoints: Draws points to the screen directly. Used primarily
    //               by undergraduates, who do calculations in JS (this file)
    // - reglBox:    Forces entire box to be drawn. The GPU is then used to
    //               determine if pixel is drawn or not. Used by graduate 
    //               students for parallel line/triangle rendering.
    const reglPoints = regl({
        // viewport
        viewport: {
            x: 0,
            y: 0,
            width: ({viewportWidth}) => viewportWidth,
            height: ({viewportHeight}) => viewportHeight
        },

        blend: {enable: true},

        // fragment shader
        frag: fragmentSource,
        
        // vertex shader
        vert: vertexSource,
    
        // attributes
        attributes: {
            // Draw a bunch of points with a bunch of colors
            position: (context, {points}) => points.flat(),
            inColor: (context, {colors}) => colors.flat(),
        },

        // vertices to draw: One per point
        count: (context, {points}) => points.length,

        primitive: 'points',

        // uniforms
        uniforms: {
            viewport: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
            mode: 0, // Points
            dpi: window.devicePixelRatio,
            'vertices[0]': [0., 0.], 
            'vertices[1]': [0., 0.], 
            'vertices[2]': [0., 0.] 
        }        
    });
    drawPointsGPU = (points, colors) => 
    {
        // Update the canvas size. Correct for window DPI
        width = canvas.clientWidth * window.devicePixelRatio;
        height = canvas.clientHeight * window.devicePixelRatio;
        if(canvas.width !== width || canvas.height !== height)
        {
            canvas.width = width;
            canvas.height = height;
            regl.poll();
        }
        // Draw the points-based code
        reglPoints({points:points,colors:colors});        
    };

    const reglBox = regl({
        // viewport
        viewport: {
            x: 0,
            y: 0,
            width: ({viewportWidth}) => viewportWidth,
            height: ({viewportHeight}) => viewportHeight
        },

        // fragment shader
        frag: fragmentSource,
        
        // vertex shader
        vert: vertexSource,

        // attributes
        attributes: {
            // A quad big enough to hold all the control vertices
            position: {
                buffer: (context, {vertices}) =>
                {
                    // Bounding box of primitive. Grow by 1 pix in every direction
                    // to correct for horizontal/vertical lines and add room for 
                    // antialiasing
                    let min_i = Math.min(...vertices.flat().filter((n,i) => i % 2 == 0));
                    let min_j = Math.min(...vertices.flat().filter((n,i) => i % 2 == 1));
                    let max_i = Math.max(...vertices.flat().filter((n,i) => i % 2 == 0));
                    let max_j = Math.max(...vertices.flat().filter((n,i) => i % 2 == 1));
                    console.log(vertices, min_i, max_i, min_j, max_j);
                    return regl.buffer(new Int16Array([
                            min_i-1, min_j-1,   max_i+1, min_j-1,   max_i+1, max_j+1,
                            min_i-1, min_j-1,   max_i+1, max_j+1,   min_i-1, max_j+1
                        ]));
                },
                size: 2
            },

            inColor: {constant: (context, {color}) => color }
        },

        // vertices to draw
        count: 6,

        // uniforms
        uniforms: {
            viewport: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
            mode: (context, {mode}) => mode, // Lines or Triangles
            dpi: window.devicePixelRatio,
            'vertices[0]': (context, {vertices}) => vertices[0], 
            'vertices[1]': (context, {vertices}) => vertices[1], 
            'vertices[2]': (context, {mode, vertices}) => 
                mode === 1? [0,0] : vertices[2] 
        }        
    });
    drawLineGPU = (vertices, color) => 
    {
        // Update the canvas size. Correct for DPI
        width = canvas.clientWidth * window.devicePixelRatio;
        height = canvas.clientHeight * window.devicePixelRatio;
        if(canvas.width !== width || canvas.height !== height)
        {
            canvas.width = width;
            canvas.height = height;
            regl.poll();
        }
    
        // Draw the GPU-based code
        reglBox({mode:1, color:color, vertices:vertices});
    };
}

// Call load when loaded
window.addEventListener("load", load);

// Handle window resizing
function resized()
{
    sizer.innerHTML = "(" + canvas.clientWidth + ", " +  canvas.clientHeight + ")";
}
window.addEventListener("resize", resized);
window.addEventListener("load", resized);

// Show or hide the help
function toggle_help()
{
    help.style.display = (help.style.display == "none"? "block" : "none");
}

// Extracted from Dr. T.J.'s "Drawing Lines" notes on Observable
// https://observablehq.com/@infowantstobeseen/drawing-lines?collection=@infowantstobeseen/computer-graphics
function drawLine(x0, y0, x1, y1)
{
    // Round to determine pixel location
    const pixel = (x, y) => [Math.round(x), Math.round(y)];

    const line_color = [color2, 255];

    // Differences and step value
    let [dx, dy] = [x1 - x0, y1 - y0];
    let step = 0;
    if(Math.abs(dx) > Math.abs(dy))
    step = Math.abs(dx);
    else
    step = Math.abs(dy);

    // Find slope and stepping direction
    dx /= step; dy /= step;

    // Generate
    let [x, y] = [x0, y0];
    const pixels = [pixel(x, y)];
    const colors = [line_color] 
    for(let i = 0; i < step; ++i)
    {
        x += dx; y += dy;
        pixels.push(pixel(x,y));
        colors.push(line_color);
    }  

    drawPointsGPU(pixels, colors);
}

// Extracted from Dr. T.J.'s "Drawing Circles" notes on Observable
// https://observablehq.com/@infowantstobeseen/drawing-circles?collection=@infowantstobeseen/computer-graphics
function drawCircle(x0, y0, r)
{
    const pixel = (x,y) => [x,y].map(Math.round);

    // Initial condition
    let [ic, jc] = pixel(x0, y0);
    r = Math.round(r);
    let [i,j] = [0, r];

    // Find the error
    let d = 1 - r;

    // Rasterize by octant; start w/ four cardinal points
    const pixels = [pixel(ic, jc + r),
                  pixel(ic, jc - r),
                  pixel(ic + r, jc),
                  pixel(ic - r, jc)];
    while(i < j)
    {
    // Update midpoint/error term
    if(d >= 0)
    {
        j -= 1;
        d -= 2 * j;
    }
    i += 1;
    d += 2 * i + 1;

    pixels.splice(pixels.length, 0, ...[pixel(ic + i, jc + j),
                                       pixel(ic + i, jc - j),
                                       pixel(ic - i, jc + j),
                                       pixel(ic - i, jc - j),
                                       pixel(ic + j, jc + i),
                                       pixel(ic + j, jc - i),
                                       pixel(ic - j, jc + i),
                                       pixel(ic - j, jc - i)]);
    }

    colors = [];
    for(let i = 0; i < pixels.length; ++i)
        colors.push(color);

    drawPointsGPU(pixels, colors);
}

function factorial(num)
{
    if (num === 0)
      { return 1; }
    else
      { return num * factorial( num - 1 ); }
}

function binomial(i, n)
{
    let res = factorial(n) / (factorial(i) * factorial(n-i));
    return res;
}

function bernstein(t, i, n)
{
    return binomial(i, n) * (Math.pow(t, i)) * (Math.pow((1 - t), (n - i)));
}

function bezier(t, points)
{
    let n = points.length - 1;
    let xc = 0;
    let yc = 0;

    for (let i = 0; i < points.length; i++)
    {
        bern = bernstein(t, i, n);
        xc += points[i][0] * bern;
        yc += points[i][1] * bern;
    }

    return [xc, yc];
}

function bezier_point_range(steps, points)
{
    let new_points = [];

    for (let i = 0; i < steps; i++)
    {
        let t = i/(steps-1);
        new_points.push(bezier(t, points));
    }

    return new_points;
}


function drawBezier(control_points, step_size)
{
    console.log(step_size);
    // let steps = 100;
    let new_points = bezier_point_range(step_size, control_points);

    let points = [];

    for (let i = 0; i < new_points.length; i++)
    {
        points.push(new_points[i][0]);
        points.push(new_points[i][1]);
    }

    return points;
}

// Referenced from Dr. T.J.'s "Chaikin's Curves" notes on Observable
// https://observablehq.com/@infowantstobeseen/chaikins-curves?collection=@infowantstobeseen/computer-graphics
function drawCurve(type, points, step_size, closed)
{
    paired_pixels = [];
    for (let i = 0; i < points.length-1; i+=2)
        paired_pixels.push([points[i], points[i+1]]);

    let new_points = [];
    let new_colors = [];
    const pixel = ([x,y]) => [x,y].map(Math.round);

    get_next_pt = (curr_pt, other_pt) => 
    {
        let next_pt_x = (3/4)*curr_pt[0] + (1/4)*other_pt[0];
        let next_pt_y = (3/4)*curr_pt[1] + (1/4)*other_pt[1];
        return [next_pt_x, next_pt_y];
    };

    if (type == "chaikin")
    {
        console.log("working on chaikin");
        while(step_size > 0)
        {
            new_points = [];
            new_colors = [];

            for (let i = 0; i < paired_pixels.length; i++)
            {
                let curr_left_pt = undefined;
                let curr_right_pt = undefined;

                if (i == 0)
                {
                    if (closed)
                        curr_left_pt = get_next_pt(paired_pixels[i], paired_pixels[paired_pixels.length - 1]);
                    curr_right_pt = get_next_pt(paired_pixels[i], paired_pixels[i+1]);
                }
                else if (i == paired_pixels.length - 1)
                {
                    curr_left_pt = get_next_pt(paired_pixels[i], paired_pixels[i-1]);
                    if (closed)
                        curr_right_pt = get_next_pt(paired_pixels[i], paired_pixels[0]);
                }
                else
                {
                    curr_left_pt = get_next_pt(paired_pixels[i], paired_pixels[i-1]);
                    curr_right_pt = get_next_pt(paired_pixels[i], paired_pixels[i+1]);
                }

                if (curr_left_pt != null)
                {
                    new_points.push(pixel(curr_left_pt));
                    new_colors.push(color);
                }

                if (curr_right_pt != undefined)
                {
                    new_points.push(pixel(curr_right_pt));
                    new_colors.push(color);
                }
            }

            paired_pixels = new_points;
            step_size--;
        }
        drawPointsGPU(new_points, new_colors);
    }
    else if (type == "bezier")
    {
        paired_pixels = [];
        for (let i = 0; i < points.length-1; i+=2)
            paired_pixels.push([points[i], points[i+1]]);

        new_points = drawBezier(paired_pixels, step_size);

        for (let i = 0; i < new_points.length; i++)
            new_colors.push(color);

        drawPointsGPU(new_points, new_colors);
    }
}


function points_is_contains(new_point)
{
    let contains = false;
    paired_pixels = [];
    const pixel = ([x,y]) => [x,y].map(Math.round);

    for (let i = 0; i < points.length-1; i+=2)
        paired_pixels.push([points[i], points[i+1]]);

    for (let i = 0; i < paired_pixels.length; i++)
    {
        let ic = paired_pixels[i][0];
        let jc = paired_pixels[i][1];
        if (new_point[0] >= ic-circle_tolerance && new_point[0] <= ic+circle_tolerance && new_point[1] >= jc-circle_tolerance && new_point[1] <= jc+circle_tolerance)
        {
            paired_pixels.splice(i, 1);
            points = [];
            contains = true;
            break;
        }
    }

    if (contains)
    {
        for (let i = 0; i < paired_pixels.length; i++)
        {
            points.push(pixel(paired_pixels[i])[0]);
            points.push(pixel(paired_pixels[i])[1]);
        }
    }

    return contains;
}

function click_interaction(type, new_point, step_size)
{
    if (new_point.length > 1)
    {
        if (!points_is_contains(new_point))
        {
            console.log("adding new point");
            points.push(new_point[0]);
            points.push(new_point[1]);
            console.log("points: ");
            console.log(points);
        }
    }

    if (points.length == 4) {
        drawLine(points[0], points[1], points[2], points[3]);
    }
    if (points.length > 2)
    {
        regl.clear({color:[1,1,1,1], depth: 1});
        drawCurve(type, points, step_size, false)

        if(EL_show_lines === 'true') {
            for (let i = 0; i < points.length; i+=2)
                drawLine(points[i], points[i+1], points[i+2], points[i+3]);
        }

        for (let i = 0; i < points.length; i+=2)
            drawCircle(points[i], points[i+1], circle_tolerance);
    } 
}
