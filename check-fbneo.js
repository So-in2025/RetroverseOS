async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/fbneo_libretro.js.zip';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('FBNeo in arian:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
