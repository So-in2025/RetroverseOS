async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/fceumm_libretro.zip';
  console.log('Checking ZIP format of', url);
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    console.log('ZIP size:', buffer.byteLength);
  } catch (e) {
    console.error(e);
  }
}
test();
