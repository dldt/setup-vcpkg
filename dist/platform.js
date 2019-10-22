"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformsInfo = {
    darwin: {
        bootstrap: "bootstrap-vcpkg.sh",
        name: "macos",
        triplet: "x64-osx",
        vcpkg: "vcpkg",
    },
    linux: {
        bootstrap: "bootstrap-vcpkg.sh",
        name: "linux",
        triplet: "x64-linux",
        vcpkg: "vcpkg",
    },
    win32: {
        bootstrap: "bootstrap-vcpkg.bat",
        name: "windows",
        triplet: "x64-windows",
        vcpkg: "vcpkg.exe",
    },
};
