# ndie + libf

## NDIE is a Non Destructive Image Editor

It has an effect stack where you can add and reorder effects that get applied to the image.

### Building | developing

Make sure you built LibF first; then `cd` into the `ndie` directory and run:

```bash
# Vite HMR for development
npm run dev

# build
npm run build
npm run preview
```

## LibF is WASM Image manipulation library

It performs... decently.

### Building | developing

Create a build directory and make sure emscripten is loaded

```bash
cd build

emcmake cmake .. -G Ninja # use ninja

ninja; cp libf.* ../../ndie/src/worker # build and copy output to the ndie src
```
