import { platformsInfo } from "./platform";

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";

import simpleGit from "simple-git/promise";

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

const mkdir = util.promisify(fs.mkdir);
const exists = util.promisify(fs.exists);

export const clone = async (repository: string, revision: string, directory: string) => {
    let git: simpleGit.SimpleGit;
    if (await exists(directory)) {
        core.info("vcpkg directory already exists. Try and update git checkout if any.");
        git = simpleGit(directory);
    } else {
        await mkdir(directory, { recursive: true });
        git = simpleGit(directory);
        await git.init();
        await git.addRemote("origin", repository);
    }

    core.info("Fetching and checking out vcpkg");

    await git.fetch("origin", revision);
    await git.checkout("FETCH_HEAD");
};

export const revision = async (directory: string) => {
    const git = simpleGit(directory);
    return await git.revparse(["@"]);
};

export const bootstrap = async (directory: string) => {
    const platformInfo = platformsInfo[os.platform() as string];

    // On MacOS install gcc@8 through homebrew. This is
    // necessary as vcpkg does not support building with
    // Apple Clang for now.
    let uninstallMacOSGcc = false;
    let bootstrapOpt = {};
    if (os.platform() === "darwin") {
        // Try to find gcc and install it if not already there.
        const gccPath = await io.which("gcc-8");
        if (!gccPath) {
            uninstallMacOSGcc = true;
            core.info("Installing gcc8");
            await exec.exec("brew install gcc@8");
        }
        // Build up a set of options to generate vcpkg
        // using a static gcc/g++ runtime so it does
        // not explicitly depend on the version of
        // gcc we used to build it.
        bootstrapOpt = {
            env: Object.assign({}, process.env, {
                CC: "gcc-8",
                CXX: "g++-8",
                CFLAGS: "-static-libgcc",
                CXXFLAGS: "-static-libstdc++ -static-libgcc",
            }),
        };
    }

    // Bootstrap vcpkg, possibly using MacOS customized env and
    // expose it to later actions.
    const bootstrapScript = path.resolve(directory, platformInfo.bootstrap);
    await exec.exec(bootstrapScript, [], bootstrapOpt);

    // MacOS cleanup
    if (uninstallMacOSGcc) {
        await exec.exec("brew uninstall gcc@8");
    }

    return path.resolve(directory, platformInfo.vcpkg);
};

export const install = async (vcpkg: string, directory: string, triplet: string, packages: string[]) => {
    core.info("Installing packages " + packages + " for triplet " + triplet);
    await exec.exec(vcpkg,
        Array.prototype.concat([
            "install",
            "--triplet",
            triplet,
        ], packages)
    );
};

export const export_ = async (vcpkg: string, vcpkgDirectory: string,
                              exportTo: string, triplet: string,
                              packages: string[]) => {
    core.info("Exporting packages for " + triplet);

    const relativeExportTo = path.relative(vcpkgDirectory, exportTo);

    await exec.exec(vcpkg,
        Array.prototype.concat([
            "export",
            "--triplet",
            triplet,
            "--output=" + relativeExportTo,
            "--raw",
        ], packages),
    );
};
