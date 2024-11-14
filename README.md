# codelabs webgpu

Working through an excellent WebGPU learning kata from (with some variation):

https://codelabs.developers.google.com/your-first-webgpu-app#1

## Quick Start

To launch:

```sh
yarn install
yarn run dev
```

Then, navigate to http://localhost:5173 in your browser (this will include HMR support if you want to poke around and experiment).

## Browser Support

Note that Firefox and several other browsers do not yet officially have full support for the WebGPU API.

https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility

I have instead been developing and testing on Chrome.

## Organization

Vertex, fragment, and compute shaders are written in WGSL and loaded as raw content within `index.mjs`.

The main program (in `index.mjs`) tracks state in several module-level variables. These are initialized in `main()` with a multi-pass command sequence defined and invoked in `updateGrid()` via interval.

Roughly, API utilization (mostly within `main()`) can be broken into several steps:

1. Assert support and resolve the adapter device

1. Identify contexts and formats from the canvas elemeent

1. Define and write relevant buffer data (including vertex, uniform, and state)

1. Define and compile shader programs

1. Specify layouts for the bind group and pipeline

1. Define the specific pipelines that will be utilized

1. Create the bind groups against the corresponding resources
