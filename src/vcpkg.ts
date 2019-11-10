import { platformsInfo } from "./platform";

import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";

import simpleGit from "simple-git/promise";

import rmfr from "rmfr";

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";

const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

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

    let bootstrapFlags: string[] = [];
    let bootstrapOpts = {};

    if (os.platform() === "darwin") {
        bootstrapFlags = ["--allowAppleClang"];
        bootstrapOpts = { env: { MACOSX_DEPLOYMENT_TARGET: "10.15" } };
        // Edit bootstrap script as its invocation of clang++ is broken wrt to
        // deployment target selection
        const bootstrapScriptContent = (await readFile("vcpkg/scripts/bootstrap.sh")).toString();
        await writeFile("vcpkg/scripts/bootstrap.sh", bootstrapScriptContent.replace("CXX=clang++", "unset CXX"));
    }

    // Bootstrap vcpkg, possibly using MacOS customized env and
    // expose it to later actions.
    const bootstrapScript = path.resolve(directory, platformInfo.bootstrap);
    await exec.exec(bootstrapScript, bootstrapFlags, bootstrapOpts);

    return path.resolve(directory, platformInfo.vcpkg);
};

export const install = async (vcpkg: string, directory: string, triplet: string, packages: string[]) => {
    for (const pkg of packages) {
        core.info("Installing packages " + pkg + " for triplet " + triplet);
        await exec.exec(vcpkg,
            [
                "install",
                "--triplet",
                triplet,
                pkg,
            ],
        );
        await rmfr(directory + "/buildtrees");
    }
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
