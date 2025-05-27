declare module 'canvas' {
  export class Canvas {
    constructor(width: number, height: number);
    getContext(contextId: string): CanvasRenderingContext2D;
    toBuffer(mimeType?: string, config?: any): Buffer;
    width: number;
    height: number;
  }
  
  export class Image {
    constructor();
    src: string;
    onload: () => void;
    onerror: (err: Error) => void;
    width: number;
    height: number;
  }
  
  export class ImageData {
    constructor(data: Uint8ClampedArray, width: number, height: number);
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  
  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(src: string | Buffer): Promise<Image>;
} 