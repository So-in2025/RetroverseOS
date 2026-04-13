async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/prosystem_libretro.zip';
  console.log('Checking ZIP existence for', url);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Status:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
