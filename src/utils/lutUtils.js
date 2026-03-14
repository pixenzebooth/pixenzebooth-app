// Utility functions for parsing and applying 3D LUT (Color Look-Up Table) files.

export const parseCubeLUT = (cubeText) => {
    const lines = cubeText.split('\n');
    let size = 33; // Default size
    let data = [];
    let min = [0, 0, 0];
    let max = [1, 1, 1];
    let title = '';

    // Remove comments
    const cleanLines = lines.map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    let dataStartIndex = 0;

    // Parse Header
    for (let i = 0; i < cleanLines.length; i++) {
        const line = cleanLines[i];
        if (line.startsWith('TITLE')) {
            title = line.split('"')[1] || line.split(' ')[1];
        } else if (line.startsWith('LUT_3D_SIZE')) {
            size = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('DOMAIN_MIN')) {
            min = line.split(' ').slice(1).map(parseFloat);
        } else if (line.startsWith('DOMAIN_MAX')) {
            max = line.split(' ').slice(1).map(parseFloat);
        } else if (/^-?\d+(\.\d+)?/.test(line)) {
            dataStartIndex = i;
            break;
        }
    }

    // Parse Data
    for (let i = dataStartIndex; i < cleanLines.length; i++) {
        const parts = cleanLines[i].split(/\s+/).map(parseFloat);
        if (parts.length >= 3) {
            data.push(parts[0], parts[1], parts[2]);
        }
    }

    return { size, data: new Float32Array(data), title, min, max };
};

// Create 3D Texture from parsed data
export const createLUTTexture = (gl, lutData) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);

    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    if (gl instanceof WebGL2RenderingContext) {
        gl.texImage3D(
            gl.TEXTURE_3D,
            0,
            gl.RGB16F, // Use float texture for precision
            lutData.size,
            lutData.size,
            lutData.size,
            0,
            gl.RGB,
            gl.FLOAT,
            lutData.data
        );
    } else {
        return null;
    }

    return texture;
};

// Create basic shader program
export const createFilterProgram = (gl) => {
    const vsSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    precision highp sampler3D;

    in vec2 v_texCoord;
    out vec4 outColor;

    uniform sampler2D u_image;
    uniform sampler3D u_lut;
    uniform float u_intensity;
    uniform bool u_useLUT;

    void main() {
        vec4 color = texture(u_image, v_texCoord);
        
        if (u_useLUT) {
            vec3 lutColor = texture(u_lut, color.rgb).rgb;
            outColor = vec4(mix(color.rgb, lutColor, u_intensity), color.a);
        } else {
            outColor = color;
        }
    }`;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    return program;
};

// Helper: Setup a fullscreen quad
export const createQuadValues = (gl) => {
    // 2 triangles covering the screen
    // x, y, u, v
    const positions = new Float32Array([
        -1, -1, 0, 1, 
        1, -1, 1, 1, 
        -1, 1, 0, 0, 
        -1, 1, 0, 0, 
        1, -1, 1, 1, 
        1, 1, 1, 0, 
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // a_position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    return { vao, count: 6 };
};

// Internal Cache for LUT texts to avoid redundant network calls
const lutTextCache = {};

/**
 * Applies a 3D LUT to a base64 or URL image and returns a base64 result.
 * Ideal for post-processing captured photos with custom filters.
 */
export const applyLutToImage = async (imageSrc, lutUrl, intensity = 1.0) => {
    if (!imageSrc || !lutUrl) return imageSrc;

    return new Promise(async (resolve) => {
        try {
            // 1. Load Image
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
            });

            // 2. Load LUT
            let lutText;
            if (lutTextCache[lutUrl]) {
                lutText = lutTextCache[lutUrl];
            } else {
                const response = await fetch(lutUrl);
                lutText = await response.text();
                lutTextCache[lutUrl] = lutText;
            }
            const lutData = parseCubeLUT(lutText);

            // 3. Setup WebGL
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
            if (!gl) {
                console.error("WebGL2 not supported for LUT application");
                resolve(imageSrc);
                return;
            }

            const program = createFilterProgram(gl);
            const { vao, count } = createQuadValues(gl);
            const lutTexture = createLUTTexture(gl, lutData);
            
            const imgTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, imgTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            // 4. Render
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.bindVertexArray(vao);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, imgTexture);
            gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_3D, lutTexture);
            gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);

            gl.uniform1f(gl.getUniformLocation(program, 'u_intensity'), intensity);
            gl.uniform1i(gl.getUniformLocation(program, 'u_useLUT'), 1);

            gl.drawArrays(gl.TRIANGLES, 0, count);

            // 5. Cleanup & Return
            const result = canvas.toDataURL('image/jpeg', 0.9);
            
            gl.deleteTexture(imgTexture);
            gl.deleteTexture(lutTexture);
            gl.deleteProgram(program);
            
            resolve(result);
        } catch (error) {
            console.error("Error applying LUT:", error);
            resolve(imageSrc);
        }
    });
};
