"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const platform_1 = require("./platform");
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const promise_1 = __importDefault(require("simple-git/promise"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const mkdir = util.promisify(fs.mkdir);
const exists = util.promisify(fs.exists);
exports.clone = (repository, revision, directory) => __awaiter(void 0, void 0, void 0, function* () {
    let git;
    if (yield exists(directory)) {
        core.info("vcpkg directory already exists. Try and update git checkout if any.");
        git = promise_1.default(directory);
    }
    else {
        yield mkdir(directory, { recursive: true });
        git = promise_1.default(directory);
        yield git.init();
        yield git.addRemote("origin", repository);
    }
    core.info("Fetching and checking out vcpkg");
    yield git.fetch("origin", revision);
    yield git.checkout("FETCH_HEAD");
});
exports.revision = (directory) => __awaiter(void 0, void 0, void 0, function* () {
    const git = promise_1.default(directory);
    return yield git.revparse(["@"]);
});
exports.bootstrap = (directory) => __awaiter(void 0, void 0, void 0, function* () {
    const platformInfo = platform_1.platformsInfo[os.platform()];
    // On MacOS install gcc@8 through homebrew. This is
    // necessary as vcpkg does not support building with
    // Apple Clang for now.
    let uninstallMacOSGcc = false;
    let bootstrapOpt = {};
    if (os.platform() === "darwin") {
        // Try to find gcc and install it if not already there.
        const gccPath = yield io.which("gcc-8");
        if (!gccPath) {
            uninstallMacOSGcc = true;
            core.info("Installing gcc8");
            yield exec.exec("brew install gcc@8");
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
    yield exec.exec(bootstrapScript, [], bootstrapOpt);
    // MacOS cleanup
    if (uninstallMacOSGcc) {
        yield exec.exec("brew uninstall gcc@8");
    }
    return path.resolve(directory, platformInfo.vcpkg);
});
exports.install = (vcpkg, directory, triplet, packages) => __awaiter(void 0, void 0, void 0, function* () {
    core.info("Installing packages " + packages + " for triplet " + triplet);
    yield exec.exec(vcpkg, Array.prototype.concat([
        "install",
        "--triplet",
        triplet,
    ], packages));
});
exports.export_ = (vcpkg, vcpkgDirectory, exportTo, triplet, packages) => __awaiter(void 0, void 0, void 0, function* () {
    core.info("Exporting packages for " + triplet);
    const relativeExportTo = path.relative(vcpkgDirectory, exportTo);
    yield exec.exec(vcpkg, Array.prototype.concat([
        "export",
        "--triplet",
        triplet,
        "--output=" + relativeExportTo,
        "--raw",
    ], packages));
});
