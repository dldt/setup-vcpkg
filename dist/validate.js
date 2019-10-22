"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const check = __importStar(require("check-types"));
const baseSchema = {
    default: {
        message: "unexpected property {p}",
        test: (p) => check.object(p),
    },
    directory: {
        message: "{p} must be a string",
        test: (p) => check.maybe.nonEmptyString(p),
    },
    export: {
        message: "{p} must be a string",
        test: (p) => check.maybe.nonEmptyString(p),
    },
    packages: {
        message: "{p} must be a string or an array of strings",
        test: (p) => check.maybe.nonEmptyString(p) || check.array.of.nonEmptyString(p),
    },
    repository: {
        message: "{p} must be a string",
        test: (p) => check.maybe.string(p),
    },
    revision: {
        message: "{p} must be a string",
        test: (p) => check.maybe.string(p),
    },
    triplet: {
        message: "{p} must be a string or an array of strings",
        test: (p) => check.maybe.nonEmptyString(p),
    },
};
const configurationSchema = Object.assign({}, baseSchema, {
    extends: {
        message: "{p} must be a string or an array of strings",
        test: (p) => check.maybe.nonEmptyString(p) || check.array.of.nonEmptyString(p),
    },
});
const validate = (schema, config, path) => {
    const errors = [];
    const warnings = [];
    for (const [key, value] of Object.entries(config)) {
        const desc = schema[key] || schema.default;
        const test = desc.test;
        const message = desc.message;
        if (!test(value)) {
            errors.push(message.replace("{p}", path ? path + "." + key : key));
        }
    }
    return { errors, warnings };
};
exports.validateConfiguration = (config) => {
    if (!check.nonEmptyObject(config)) {
        return { errors: ["Invalid or empty configuration."] };
    }
    const status = validate(baseSchema, config);
    for (const [key, value] of Object.entries(config)) {
        if (check.object(value)) {
            const configStatus = validate(configurationSchema, value, key);
            status.errors = Array.prototype.concat(status.errors, configStatus.errors);
            status.warnings = Array.prototype.concat(status.warnings, configStatus.warnings);
        }
    }
    return {
        errors: status.errors.length ? status.errors : undefined,
        warnings: status.warnings.length ? status.warnings : undefined,
    };
};
