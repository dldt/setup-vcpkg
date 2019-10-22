export interface IPlatformInfo {
    bootstrap: string;
    name: string;
    triplet: string;
    vcpkg: string;
}

export interface IPlatformsInfo {
    [key: string]: IPlatformInfo;
}

export const platformsInfo: IPlatformsInfo = {
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
