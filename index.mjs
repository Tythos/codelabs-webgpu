/**
 * index.mjs
 */

import vertexShaderSource from "./src/basic.v.wgsl?raw";
import fragmentShaderSource from "./src/basic.f.wgsl?raw";

const GRID_SIZE = 32;
const UPDATE_INTERVAL_MS = 200;
let ADAPTER_DEVICE = null;
let CANVAS_CONTEXT = null;
let CELL_PIPELINE = null;
let VERTEX_BUFFER = null;
let BIND_GROUPS = null;
let VERTEX_DATA = null;
let STEP = 0;

function updateGrid() {
    STEP += 1;

    // encode render pass
    const encoder = ADAPTER_DEVICE.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        "colorAttachments": [{
            "view": CANVAS_CONTEXT.getCurrentTexture().createView(),
            "loadOp": "clear",
            "clearValue": [0.1, 0.2, 0.3, 1.0],
            "storeOp": "store"
        }]
    });
    pass.setPipeline(CELL_PIPELINE);
    pass.setBindGroup(0, BIND_GROUPS[STEP % 2]);
    pass.setVertexBuffer(0, VERTEX_BUFFER);
    pass.draw(VERTEX_DATA.length / 2, GRID_SIZE * GRID_SIZE);
    pass.end();
    const commandBuffer = encoder.finish();
    ADAPTER_DEVICE.queue.submit([commandBuffer]);
}

async function main() {
    // assert support, resolve adapter device
    if (!window.navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await window.navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }
    ADAPTER_DEVICE = await adapter.requestDevice();
    
    // identify context, format from canvas
    const canvas = window.document.querySelector("canvas");
    CANVAS_CONTEXT = canvas.getContext("webgpu");
    const canvasFormat = window.navigator.gpu.getPreferredCanvasFormat();
    CANVAS_CONTEXT.configure({
        "device": ADAPTER_DEVICE,
        "format": canvasFormat
    });

    // define vertex buffer
    VERTEX_DATA = new Float32Array([
        -0.8, -0.8,
        0.8, -0.8,
        0.8, 0.8,

        -0.8, -0.8,
        0.8, 0.8,
        -0.8, 0.8
    ]);
    VERTEX_BUFFER = ADAPTER_DEVICE.createBuffer({
        "label": "Cell vertices",
        "size": VERTEX_DATA.byteLength,
        "usage": GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    ADAPTER_DEVICE.queue.writeBuffer(VERTEX_BUFFER, /*bufferOffset=*/0, VERTEX_DATA);
    const vertexBufferLayout = {
        "arrayStride": 8,
        "attributes": [{
            "format": "float32x2",
            "offset": 0,
            "shaderLocation": 0
        }]
    };

    // define uniform buffer
    const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
    const uniformBuffer = ADAPTER_DEVICE.createBuffer({
        "label": "Grid Uniforms",
        "size": uniformArray.byteLength,
        "usage": GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    ADAPTER_DEVICE.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    // define state buffer
    const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
    const cellStateStorage = [
        ADAPTER_DEVICE.createBuffer({
            "label": "Cell State",
            "size": cellStateArray.byteLength,
            "usage": GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        }),
        ADAPTER_DEVICE.createBuffer({
            "label": "Cell State B",
            "size": cellStateArray.byteLength,
            "usage": GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        })
    ];
    for (let i = 0; i < cellStateArray.length; i += 3) {
        cellStateArray[i] = 1;
    }
    ADAPTER_DEVICE.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
    for (let i = 0; i < cellStateArray.length; i += 1) {
        cellStateArray[i] = i % 2;
    }
    ADAPTER_DEVICE.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

    // define/compile shader programs
    const cellShaderModule = ADAPTER_DEVICE.createShaderModule({
        "label": "Cell shader",
        "code": [
            vertexShaderSource,
            fragmentShaderSource
        ].join("\n")
    });

    // define pipeline from program and buffers
    CELL_PIPELINE = ADAPTER_DEVICE.createRenderPipeline({
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

    // define pipeline bindings
    BIND_GROUPS = [
        ADAPTER_DEVICE.createBindGroup({
            "label": "Cell renderer bind group A",
            "layout": CELL_PIPELINE.getBindGroupLayout(0),
            "entries": [{
                "binding": 0,
                "resource": { "buffer": uniformBuffer }
            }, {
                "binding": 1,
                "resource": { "buffer": cellStateStorage[0] }
            }]
        }),
        ADAPTER_DEVICE.createBindGroup({
            "label": "Cell renderer bind group B",
            "layout": CELL_PIPELINE.getBindGroupLayout(0),
            "entries": [{
                "binding": 0,
                "resource": { "buffer": uniformBuffer }
            }, {
                "binding": 1,
                "resource": { "buffer": cellStateStorage[1] }
            }]
        })
    ];

    // finally, launch the main loop
    setInterval(updateGrid, UPDATE_INTERVAL_MS);
}

window.addEventListener("load", main);
