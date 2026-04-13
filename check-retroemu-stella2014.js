async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/stella2014_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella2014 in retroemu cores:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
