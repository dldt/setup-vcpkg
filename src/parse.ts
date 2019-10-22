import { IImportGlobalConfiguration, IImportPlatformConfiguration } from "./interfaces";

import check from "check-types";

interface IPlatformConfigurationSet {
    [key: string]: IImportPlatformConfiguration;
}

interface IPlatformConfigurationSetAndStatus {
    configs: IPlatformConfigurationSet;
    errors: string[]|undefined;
}

const parseGlobalConfiguration = (config: IImportGlobalConfiguration): IImportPlatformConfiguration => {
    return {
        directory: config.directory,
        export: config.export,
        extends: [],
        packages: config.packages || [],
        repository: config.repository,
        revision: config.revision,
        triplet: config.triplet,
    };
};

const merge = (a: string|string[], b: string|string[]): string[] => {
    const s = new Set(Array.prototype.concat(a, b));
    s.delete(undefined);
    return [... s ];
};

const extendPlatformConfiguration = (config: IImportPlatformConfiguration,
                                     base: IImportPlatformConfiguration): IImportPlatformConfiguration => {
    return {
        directory: config.directory || base.directory,
        export: config.export || base.export,
        extends: merge(config.extends, base.extends),
        packages: merge(config.packages, base.packages),
        repository: config.repository || base.repository,
        revision: config.revision || base.revision,
        triplet: config.triplet || base.triplet,
    };
};

const parsePlatformConfiguration = (config: IImportPlatformConfiguration,
                                    base: IImportPlatformConfiguration): IImportPlatformConfiguration => {
    return extendPlatformConfiguration(config, base);
};

export const parse = (config: IImportGlobalConfiguration|IImportPlatformConfiguration):
        IPlatformConfigurationSetAndStatus => {
    const baseConfiguration = parseGlobalConfiguration(config as IImportGlobalConfiguration);
    const configs: IPlatformConfigurationSet = {};

    const errors: string[] = [];

    for (const [key, value] of Object.entries(config)) {
        if (check.object(value)) {
            let platformConfig = parsePlatformConfiguration(value as IImportPlatformConfiguration, baseConfiguration);
            for (const ext of platformConfig.extends) {
                if (ext in configs) {
                    platformConfig = extendPlatformConfiguration(platformConfig, configs[ext]);
                } else {
                    errors.push(ext + " does not exist when trying to extend " + key);
                }
            }
            configs[key] = platformConfig;
        }
    }

    configs.__default = baseConfiguration;

    return {
        configs,
        errors: errors.length ? errors : undefined,
    };
};
