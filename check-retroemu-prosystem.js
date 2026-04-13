async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/prosystem_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('ProSystem in retroemu cores:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
