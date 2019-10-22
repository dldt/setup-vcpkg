import * as check from "check-types";

export interface IConfigurationStatus {
    errors?: string[];
    warnings?: string[];
}

interface IInternalConfigurationStatus {
    errors: string[];
    warnings: string[];
}

interface ISchemaEntry {
    message: string;
    test: (p: any) => boolean;
}

interface ISchema {
    [key: string]: ISchemaEntry;
    default: ISchemaEntry;
}

const baseSchema: ISchema = {
    default: {
        message: "unexpected property {p}",
        test: (p: any) => check.object(p),
    },
    directory: {
        message: "{p} must be a string",
        test: (p: any) => check.maybe.nonEmptyString(p),
    },
    export: {
        message: "{p} must be a string",
        test: (p: any) => check.maybe.nonEmptyString(p),
    },
    packages: {
        message: "{p} must be a string or an array of strings",
        test: (p: any) => check.maybe.nonEmptyString(p) || (check.array.of.nonEmptyString as any)(p),
    },
    repository: {
        message: "{p} must be a string",
        test: (p: any) => check.maybe.string(p),
    },
    revision: {
        message: "{p} must be a string",
        test: (p: any) => check.maybe.string(p),
    },
    triplet: {
        message: "{p} must be a string or an array of strings",
        test: (p: any) => check.maybe.nonEmptyString(p),
    },
};

const configurationSchema: ISchema = Object.assign({}, baseSchema, {
    extends: {
        message: "{p} must be a string or an array of strings",
        test: (p: any) => check.maybe.nonEmptyString(p) || (check.array.of.nonEmptyString as any)(p),
    },
});

const validate = (schema: ISchema, config: any, path?: string): IInternalConfigurationStatus => {
    const errors: string[] = [];
    const warnings: string[] = [];

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

export const validateConfiguration = (config: any): IConfigurationStatus => {
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
