/**
 * index.mjs
 */

import vertexShaderSource from "./src/basic.v.wgsl?raw";
import fragmentShaderSource from "./src/basic.f.wgsl?raw";

async function main() {
    // assert support, resolve adapter device
    if (!window.navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await window.navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }
    const device = await adapter.requestDevice();
    
    // identify context, format from canvas
    const canvas = window.document.querySelector("canvas");
    const context = canvas.getContext("webgpu");
    const canvasFormat = window.navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        "device": device,
        "format": canvasFormat
    });

    // define/populate buffers
    const vertices = new Float32Array([
        -0.8, -0.8,
        0.8, -0.8,
        0.8, 0.8,

        -0.8, -0.8,
        0.8, 0.8,
        -0.8, 0.8
    ]);
    const vertexBuffer = device.createBuffer({
        "label": "Cell vertices",
        "size": vertices.byteLength,
        "usage": GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);
    const vertexBufferLayout = {
        "arrayStride": 8,
        "attributes": [{
            "format": "float32x2",
            "offset": 0,
            "shaderLocation": 0
        }]
    };

    // define/compile shader programs
    const cellShaderModule = device.createShaderModule({
        "label": "Cell shader",
        "code": [
            vertexShaderSource,
            fragmentShaderSource
        ].join("\n")
    });

    // define pipeline with render pass
    const cellPipeline = device.createRenderPipeline({
        "label": "Cell pipeline",
        "layout": "auto",
        "vertex": {
            "module": cellShaderModule,
            "entryPoint": "vertexMain",
            "buffers": [vertexBufferLayout]
        },
        "fragment": {
            "module": cellShaderModule,
            "entryPoint": "fragmentMain",
            "targets": [{
                "format": canvasFormat
            }]
        }
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        "colorAttachments": [{
            "view": context.getCurrentTexture().createView(),
            "loadOp": "clear",
            "clearValue": [0.1, 0.2, 0.3, 1.0],
            "storeOp": "store"
        }]
    });
    pass.setPipeline(cellPipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(vertices.length / 2);
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

window.addEventListener("load", main);
