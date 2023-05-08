#pragma once

#include <emscripten.h>

#include "types.hh"
#include "libf.hh"

#define API EMSCRIPTEN_KEEPALIVE

API bool img_compare(Image *a, Image *b);
API I32 inline clamp(I32 min, I32 val, I32 max);
API SZ inline img_buffer_sz(U16 w, U16 h);
API SZ inline align128(SZ s);
API U8 inline clamp_u8(F32 f);
API U8 inline clamp_u8(I32 f);

I32 inline clamp(I32 min, I32 val, I32 max)
{
    if (val < min)
        return min;
    if (val > max)
        return max;
    return val;
}

SZ inline img_buffer_sz(U16 w, U16 h)
{
    return (SZ)w * (SZ)h * 4;
}

SZ inline align128(SZ s)
{
    constexpr SZ align = sizeof(v128_t);

    return s + (align - s % align);
}

template <typename T>
T inline min(T a, T b)
{
    if (a < b)
        return a;
    else
        return b;
}

template <typename T>
T inline max(T a, T b)
{
    if (a > b)
        return a;
    else
        return b;
}

U8 inline clamp_u8(F32 f)
{
    if (f < 0)
        f = 0;
    if (f > 255)
        f = 255;

    return f;
}

U8 inline clamp_u8(I32 f)
{
    if (f < 0)
        f = 0;
    if (f > 255)
        f = 255;

    return f;
}

F32 inline clamp_norm(I32 f)
{
    if (f < 0)
        return 0;
    if (f > 1)
        return 1;
    return f;
}

struct RGB
{
    F32 r; // a fraction between 0 and 1
    F32 g; // a fraction between 0 and 1
    F32 b; // a fraction between 0 and 1
};

struct HSV
{
    F32 h; // angle in degrees
    F32 s; // a fraction between 0 and 1
    F32 v; // a fraction between 0 and 1
};

HSV rgb2hsv(RGB in);
RGB hsv2rgb(HSV in);
