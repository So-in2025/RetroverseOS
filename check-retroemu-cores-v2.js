async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in retroemu cores:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
