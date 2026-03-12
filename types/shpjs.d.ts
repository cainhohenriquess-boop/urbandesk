declare module "shpjs" {
  const shp: (input: ArrayBuffer | Buffer | string) => Promise<any>;
  export default shp;
}
