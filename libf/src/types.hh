#pragma once
#include <cstdlib>
#include <cstdint>
#include <cstdbool>
#include <wasm_simd128.h>

// cool type names
typedef uint8_t U8;
typedef uint16_t U16;
typedef uint32_t U32;
typedef int32_t I32;
typedef v128_t V128;
typedef size_t SZ;
typedef float F32;

#define SIMDALIGN __attribute__((aligned(16)))
#define BYTEALIGN __attribute__((aligned(1)))

struct BYTEALIGN Color
{
    U8 r, g, b, a;
};

union ImageView
{
    U8 *bytes;
    U32 *rgba;
    Color *pixels;
};

struct SIMDALIGN Kernel
{
    U8 s;
    F32 mul;
    I32 *data;
};

struct SIMDALIGN Image
{
    U16 w;
    U16 h;
    ImageView data;
};