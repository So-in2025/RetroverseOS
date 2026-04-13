async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/fbneo_libretro.zip';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Size:', res.headers.get('content-length'));
  } catch (e) {
    console.error(e);
  }
}
test();
