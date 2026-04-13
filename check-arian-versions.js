async function test() {
  const versions = ['v1.22.1', 'v1.22.0', 'v1.21.0', 'v1.20.0'];
  for (const v of versions) {
    const url = `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@${v}/retroarch/stella_libretro.js.zip`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      console.log(`${v}: ${res.status}`);
    } catch (e) {
      console.log(`${v}: Error`);
    }
  }
}
test();
