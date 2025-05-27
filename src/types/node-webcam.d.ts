declare module 'node-webcam' {
  export interface Options {
    width?: number;
    height?: number;
    quality?: number;
    delay?: number;
    saveShots?: boolean;
    output?: string;
    device?: boolean | string;
    callbackReturn?: string;
    verbose?: boolean;
  }

  export interface Webcam {
    capture(location: string, callback: (err: any, data: any) => void): void;
    list(callback: (list: string[]) => void): void;
    clear(): void;
  }

  export function create(options?: Options): Webcam;
  export function capture(location: string, options: Options, callback: (err: any, data: any) => void): void;
  export function list(callback: (list: string[]) => void): void;
} 