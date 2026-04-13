async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella JS in arian:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
