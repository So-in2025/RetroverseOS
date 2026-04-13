async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.10.0/retroarch/stella_libretro.js.zip';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in arian v1.10.0:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
