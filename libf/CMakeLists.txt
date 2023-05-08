cmake_minimum_required(VERSION 3.8)
project(libf)

add_definitions(-std=c++17)
set (CMAKE_CXX_STANDARD 17)


# Debug + safe memory
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -flto -g3 -msimd128 -s ASSERTIONS=1 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s TOTAL_MEMORY=1024MB --no-entry")

# Debug
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -flto -g3 -msimd128 -s MODULARIZE=1 -s EXPORT_ES6=1 -s TOTAL_MEMORY=1024MB --no-entry")

# Release (O3)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -flto -msimd128 --closure 1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s TOTAL_MEMORY=1024MB --no-entry -Wall -Wno-unused-command-line-argument")

add_executable(libf src/libf.cc src/libfsimd.cc src/util.cc)