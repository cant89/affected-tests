declare module 'madge' {
  interface MadgeConfig {
    fileExtensions?: string[];
    tsConfig?: string;
    baseDir?: string;
    excludeRegExp?: RegExp[];
    detectiveOptions?: {
      ts?: {
        skipTypeImports?: boolean;
      };
    };
  }

  interface MadgeInstance {
    depends(filePath: string): string[];
    orphans(): string[];
    leaves(): string[];
    obj(): Record<string, string[]>;
    circular(): string[][];
    circularGraph(): Record<string, string[]>;
  }

  function madge(
    source: string | string[],
    config?: MadgeConfig
  ): Promise<MadgeInstance>;

  export = madge;
}
