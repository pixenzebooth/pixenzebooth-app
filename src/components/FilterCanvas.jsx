import React, { useRef, useEffect, useState } from 'react';
import { parseCubeLUT, createLUTTexture, createFilterProgram, createQuadValues } from '../utils/lutUtils';

// Module-level LUT cache — shared across all FilterCanvas instances
const lutCache = {};

const FilterCanvas = ({ videoElement, lutUrl, intensity = 1.0, isMirrored = false, onCanvasReady }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const glRef = useRef(null);
    const programRef = useRef(null);
    const lutTextureRef = useRef(null);
    const videoTextureRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize WebGL
        const gl = canvasRef.current.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false });
        if (!gl) {
            return;
        }
        glRef.current = gl;

        // Create Program
        programRef.current = createFilterProgram(gl);

        // Setup Geometry
        const { vao, count } = createQuadValues(gl);

        // Initialize Video Texture
        const videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        videoTextureRef.current = videoTexture;

        // Notify parent about canvas (for capturing)
        if (onCanvasReady) onCanvasReady(canvasRef.current);

        // Clean up
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // Clean up WebGL resources to prevent GPU memory leak
            const gl = glRef.current;
            if (gl) {
                if (videoTextureRef.current) gl.deleteTexture(videoTextureRef.current);
                if (lutTextureRef.current) gl.deleteTexture(lutTextureRef.current);
                if (programRef.current) gl.deleteProgram(programRef.current);
                // Note: We should also delete buffers if we kept references to them, 
                // but for now deleting the main heavy textures is the priority.
            }
        };
    }, []);

    // Load LUT when URL changes
    useEffect(() => {
        const gl = glRef.current;
        if (!gl || !lutUrl) {
            return;
        }

        const loadLUT = async () => {
            // Check module-level cache first
            if (lutCache[lutUrl]) {
                updateLUTTexture(lutCache[lutUrl]);
                return;
            }

            try {
                const response = await fetch(lutUrl);
                const text = await response.text();
                const lutData = parseCubeLUT(text);
                lutCache[lutUrl] = lutData;
                updateLUTTexture(lutData);
            } catch (err) {
            }
        };

        loadLUT();
    }, [lutUrl]);

    const updateLUTTexture = (lutData) => {
        const gl = glRef.current;
        if (!gl) return;

        // Delete old LUT texture if exists
        if (lutTextureRef.current) gl.deleteTexture(lutTextureRef.current);

        lutTextureRef.current = createLUTTexture(gl, lutData);
    };

    // Render Loop
    useEffect(() => {
        if (!videoElement) return;

        const animate = () => {
            render();
            requestRef.current = requestAnimationFrame(animate);
        };

        const render = () => {
            const gl = glRef.current;
            const program = programRef.current;
            if (!gl || !program || !canvasRef.current || !videoElement || videoElement.readyState < 2) return;

            // Resize Canvas to match Video
            const displayWidth = videoElement.videoWidth;
            const displayHeight = videoElement.videoHeight;

            if (canvasRef.current.width !== displayWidth || canvasRef.current.height !== displayHeight) {
                canvasRef.current.width = displayWidth;
                canvasRef.current.height = displayHeight;
                gl.viewport(0, 0, displayWidth, displayHeight);
            }

            gl.useProgram(program);

            // Update Video Texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, videoTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);

            // Bind LUT Texture
            if (lutTextureRef.current) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_3D, lutTextureRef.current);
                gl.uniform1i(gl.getUniformLocation(program, 'u_useLUT'), 1);
            } else {
                gl.uniform1i(gl.getUniformLocation(program, 'u_useLUT'), 0);
            }

            // Uniforms
            gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);
            gl.uniform1i(gl.getUniformLocation(program, 'u_lut'), 1);
            gl.uniform1f(gl.getUniformLocation(program, 'u_intensity'), intensity);

            // Draw
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [videoElement, intensity, isMirrored]);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover ${isMirrored ? 'transform -scale-x-100' : ''}`}
        />
    );
};

export default FilterCanvas;
