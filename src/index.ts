import { IImportPlatformConfiguration, IPlatformConfiguration } from "./interfaces";
import { parse } from "./parse";
import { IPlatformInfo, platformsInfo } from "./platform";
import { validateConfiguration } from "./validate";
import * as vcpkg from "./vcpkg";

import * as core from "@actions/core";

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as toml from "toml";
import * as util from "util";

const dumpWarnings = (group: string, warnings: string[]) => {
    core.warning("Passed with the following warnings:");
    core.startGroup(group);
    warnings.map((m) => core.warning(m));
    core.endGroup();
};

const dumpErrors = (group: string, errors: string[]) => {
    core.warning("Failed with the following errors:");
    core.startGroup(group);
    errors.map((m) => core.warning(m));
    core.endGroup();
};

const validate = (config: any) => {
    const { errors, warnings } = validateConfiguration(config);
    if (warnings) {
        dumpWarnings("Configuration parsing", warnings);
    }
    if (errors) {
        dumpErrors("Configuration parsing", errors);
        throw new Error("Configuration error");
    }
};

const fixUpConfig = (config: IImportPlatformConfiguration, platformInfo: IPlatformInfo): IPlatformConfiguration => {
    const fixedUpConfig: IPlatformConfiguration = {
        ...config,
        directory: config.directory ? path.resolve(config.directory) : "vcpkg",
        export: config.export ? path.resolve(config.export) : undefined,
        packages: Array.prototype.concat(config.packages),
        triplet: config.triplet || platformInfo.triplet,
    }
    return fixedUpConfig;
};

async function run() {
    try {
        const platform = os.platform();
        if (!(platform in platformsInfo)) {
            core.setFailed("Unsupported platform " + os.platform());
            throw new Error("Unsupported platform " + os.platform());
        }
        const platformInfo = platformsInfo[platform];
        const platformName = core.getInput("platform") || platformInfo.name;

        const configFile = core.getInput("config-file") || "./setup-vcpkg.toml";

        let config = toml.parse(fs.readFileSync(configFile).toString());
        config = JSON.parse(JSON.stringify(config));

        validate(config);

        const { configs, errors } = parse(config);
        if (errors) {
            dumpErrors("Configuration parsing", errors);
            throw new Error("Configuration error");
        }

        config = (platformName in configs) ? configs[platformName] : configs.__default;
        const platformConfig = fixUpConfig(config, platformInfo);

        core.debug(util.inspect(platformConfig));

        let revision: string;
        if (platformConfig.repository && platformConfig.revision) {
            revision = platformConfig.revision;
            await vcpkg.clone(platformConfig.repository, platformConfig.revision, platformConfig.directory);
        } else {
            revision = await vcpkg.revision(platformConfig.directory);
        }

        core.setOutput("vcpkg-root", platformConfig.directory);

        const vcpkgExe = await vcpkg.bootstrap(platformConfig.directory);
        core.setOutput("vcpkg", vcpkgExe);

        if (platformConfig.packages.length) {
            await vcpkg.install(vcpkgExe, platformConfig.directory, platformConfig.triplet, platformConfig.packages);
        }

        if (platformConfig.export) {
            const exportPath = platformConfig.export
                .replace("<platform>", platformName)
                .replace("<revision>", revision);

            await vcpkg.export_(vcpkgExe, platformConfig.directory, exportPath,
                                platformConfig.triplet, platformConfig.packages);
            core.debug("export " + exportPath);
            core.setOutput("export", exportPath);
            core.setOutput("export-name", path.basename(exportPath));
        }
    } catch (error) {
        core.setFailed(error);
    }
}

run();
