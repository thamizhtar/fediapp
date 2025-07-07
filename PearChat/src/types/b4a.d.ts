declare module 'b4a' {
  function from(data: string | Uint8Array | ArrayBuffer): Uint8Array
  function toString(data: Uint8Array): string
  function alloc(size: number): Uint8Array
  function allocUnsafe(size: number): Uint8Array
  function concat(arrays: Uint8Array[]): Uint8Array
  function equals(a: Uint8Array, b: Uint8Array): boolean
  function compare(a: Uint8Array, b: Uint8Array): number
  
  export = {
    from,
    toString,
    alloc,
    allocUnsafe,
    concat,
    equals,
    compare
  }
}
