/**
 * index.mjs
 */

async function main() {
    const canvas = window.document.querySelector("canvas");
    if (!window.navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await window.navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    const canvasFormat = window.navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        "device": device,
        "format": canvasFormat
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
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

window.addEventListener("load", main);
