// A2 Rasterization vertex shader
// Nothing is needed for students here; can leave alone

precision highp float;

// Attributes are input per vertex
attribute vec2 position; // The vertex position. Point pos or screen corner
attribute vec4 inColor;  // Color of teh point/line/triangle

// Uniform variables are constant over image
uniform float dpi;         // Correct for HPI and point size
uniform vec2 viewport;   // Width/Height of the viewport

// Varying variables change per pixel
varying vec4 color;      // Color of the point/line/triangle

// Globals
// Orthographic projection
mat4 ortho = mat4(2.0 / viewport[0], 0.0,               0.0, 0.0,
                  0.0,               2.0 / viewport[1], 0.0, 0.0,
                  0.0,               0.0,               0.0, 0.0,
                 -1.0,              -1.0,               0.0, 1.0);

void main() 
{  
    // Unlike A1, we are using screen coordinates for our world
    // coordinate space. Thus we need a viewing transform to get
    // normalized device coordinates. Just use a classic orthographic
    // projection
    gl_Position = ortho * vec4(position, 0.0, 1.0);

    // Just copy the color down the pipeline
    color = inColor;

    // We need the point size if rendering points (as undergraduates are)
    gl_PointSize = dpi;
}
