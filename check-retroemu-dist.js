async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/dist/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in retroemu dist:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
