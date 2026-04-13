async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/Abdess/retroarch-wasm@master/cores/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in Abdess:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
