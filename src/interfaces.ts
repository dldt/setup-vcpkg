interface IImportBaseConfiguration {
    directory: string|undefined;
    export: string|undefined;
    packages: string|string[];
    repository: string|undefined;
    revision: string|undefined;
    triplet: string|undefined;
}

export interface IImportPlatformConfiguration extends IImportBaseConfiguration {
    extends: string|string[];
}

export type IImportGlobalConfiguration = IImportBaseConfiguration;

export type IPlatformConfiguration = IImportPlatformConfiguration & {
    directory: string;
    packages: string[];
    triplet: string;
};
