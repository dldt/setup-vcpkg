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
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("./parse");
const platform_1 = require("./platform");
const validate_1 = require("./validate");
const vcpkg = __importStar(require("./vcpkg"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const toml = __importStar(require("toml"));
const util = __importStar(require("util"));
const dumpWarnings = (group, warnings) => {
    core.warning("Passed with the following warnings:");
    core.startGroup(group);
    warnings.map((m) => core.warning(m));
    core.endGroup();
};
const dumpErrors = (group, errors) => {
    core.warning("Failed with the following errors:");
    core.startGroup(group);
    errors.map((m) => core.warning(m));
    core.endGroup();
};
const validate = (config) => {
    const { errors, warnings } = validate_1.validateConfiguration(config);
    if (warnings) {
        dumpWarnings("Configuration parsing", warnings);
    }
    if (errors) {
        dumpErrors("Configuration parsing", errors);
        throw new Error("Configuration error");
    }
};
const fixUpConfig = (config, platformInfo) => {
    const fixedUpConfig = Object.assign(Object.assign({}, config), { directory: config.directory ? path.resolve(config.directory) : "vcpkg", export: config.export ? path.resolve(config.export) : undefined, packages: Array.prototype.concat(config.packages), triplet: config.triplet || platformInfo.triplet });
    return fixedUpConfig;
};
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const platform = os.platform();
            if (!(platform in platform_1.platformsInfo)) {
                core.setFailed("Unsupported platform " + os.platform());
                throw new Error("Unsupported platform " + os.platform());
            }
            const platformInfo = platform_1.platformsInfo[platform];
            const platformName = core.getInput("platform") || platformInfo.name;
            const configFile = core.getInput("config-file") || "./setup-vcpkg.toml";
            let config = toml.parse(fs.readFileSync(configFile).toString());
            config = JSON.parse(JSON.stringify(config));
            validate(config);
            const { configs, errors } = parse_1.parse(config);
            if (errors) {
                dumpErrors("Configuration parsing", errors);
                throw new Error("Configuration error");
            }
            config = (platformName in configs) ? configs[platformName] : configs.__default;
            const platformConfig = fixUpConfig(config, platformInfo);
            core.debug(util.inspect(platformConfig));
            let revision;
            if (platformConfig.repository && platformConfig.revision) {
                revision = platformConfig.revision;
                yield vcpkg.clone(platformConfig.repository, platformConfig.revision, platformConfig.directory);
            }
            else {
                revision = yield vcpkg.revision(platformConfig.directory);
            }
            const vcpkgExe = yield vcpkg.bootstrap(platformConfig.directory);
            core.setOutput("vcpkg", vcpkgExe);
            core.setOutput("vcpkg-root", platformConfig.directory);
            if (platformConfig.packages.length) {
                yield vcpkg.install(vcpkgExe, platformConfig.directory, platformConfig.triplet, platformConfig.packages);
            }
            if (platformConfig.export) {
                const exportPath = platformConfig.export
                    .replace("<platform>", platformName)
                    .replace("<revision>", revision);
                yield vcpkg.export_(vcpkgExe, platformConfig.directory, exportPath, platformConfig.triplet, platformConfig.packages);
                core.debug("export " + exportPath);
                core.setOutput("export", exportPath);
                core.setOutput("export-name", path.basename(exportPath));
            }
        }
        catch (error) {
            core.setFailed(error);
        }
    });
}
run();
