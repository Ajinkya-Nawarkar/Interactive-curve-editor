// A2 Rasterization fragment shader
// Name:
// NetId:
// Goal: Implement a set of rasterization operations
// - Line drawing
// - Polygon drawing
// - Some other operations
// Undergraduates will do their rendering on the CPU in JS and
// just use the shaders without modification. Graduate students will render
// lines/triangles on the GPU directly, and only use the CPU/JS
// to set up those calls as appropriate.

precision highp float;

// Uniform variables are constant over image
uniform int mode;           // The drawing mode {0: pts, 1: lines, 2: tris}
uniform vec2 vertices[3];   // Control vertices for line/tri drawing modes

// Varying variables change per pixel
varying vec4 color;         // The potential color of the fragment with alpha


// TODO: Add helper functions or variables if needed

void main() 
{
    // Which mode?
    // - mode == 0: Points mode. Just return the color
    // - mode == 1: Lines mode. Use the first two points of vertices to
    //              determine if this fragment is on the line
    // - mode == 2: Triangle mode. Use all three points of vertices to 
    //              determine if the fragment is in the triangle.
    if(mode == 0)
    {
        // Points. 
        // Just use the point info sent. Primarily for undergraduates
        gl_FragColor = vec4(color / 255.); 
    }
    else if(mode == 1)
    {
        // Lines. 
        // TODO for Graduate Students
    }
    else if(mode == 2)
    {
        // Triangles.
        // TODO for Graduate Students
    }
}
