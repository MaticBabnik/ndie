#pragma once
#include <cstdio>
#include <cstdlib>

#include <emscripten.h>
#include <wasm_simd128.h>

#include "util.hh"
#include "types.hh"

#define API EMSCRIPTEN_KEEPALIVE

extern "C"
{

    API void f_free(void *p);
    API Image *img_alloc(U16 w, U16 h);
    API void px_dump(Image *src, U16 x, U16 y);

    // Pixel filters
    API bool px_inv(Image *src, Image *dst);
    API bool px_inv_simd(Image *src, Image *dst);

    API bool px_gray(Image *src, Image *dst);
    API bool px_gray_simd(Image *src, Image *dst);

    API bool px_trsh(Image *src, Image *dst, U8 v);
    API bool px_trsh_simd(Image *src, Image *dst);

    API bool px_hsv_adjust(Image *src, Image *dst, F32 ha, F32 sa, F32 va);

    API bool px_gamma(Image *src, Image *dst, F32 gamma);

    API bool px_lin_brightness(Image *src, Image *dst, F32 mul);

    API bool px_pixelate(Image *src, Image *dst, U8 size);

    API bool px_bitcrush(Image *src, Image *dst, U8 crush);

    API bool px_noise(Image *src, Image *dst, U8 noise, bool color, U32 seed);

    // Kernels
    API Kernel *krn_alloc(U8 s);
    API void krn_dump(Kernel *mtx);

    API bool krn_apply(Image *src, Image *dst, Kernel *mtx);
    API bool krn_apply_simd(Image *src, Image *dst, Kernel *kernel);

    API bool im_pixelate(Image *src, Image *dst, U16 size);
    API bool im_noise(Image *src, Image *dst, U8 cover, U8 opaciy, U8 Chroma);

    API bool meta_histogram(Image *src, Image *dst);
}

#define GS_RED 0.2126f
#define GS_BLUE 0.0722f
#define GS_GREEN 0.7152
