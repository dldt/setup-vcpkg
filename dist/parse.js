"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const check_types_1 = __importDefault(require("check-types"));
const parseGlobalConfiguration = (config) => {
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
const merge = (a, b) => {
    const s = new Set(Array.prototype.concat(a, b));
    s.delete(undefined);
    return [...s];
};
const extendPlatformConfiguration = (config, base) => {
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
const parsePlatformConfiguration = (config, base) => {
    return extendPlatformConfiguration(config, base);
};
exports.parse = (config) => {
    const baseConfiguration = parseGlobalConfiguration(config);
    const configs = {};
    const errors = [];
    for (const [key, value] of Object.entries(config)) {
        if (check_types_1.default.object(value)) {
            let platformConfig = parsePlatformConfiguration(value, baseConfiguration);
            for (const ext of platformConfig.extends) {
                if (ext in configs) {
                    platformConfig = extendPlatformConfiguration(platformConfig, configs[ext]);
                }
                else {
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
