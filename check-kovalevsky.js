async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/KovalevskY/libretro-cores-wasm@master/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in KovalevskY:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
