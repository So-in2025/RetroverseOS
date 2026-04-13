async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/nostalgist@0.21.0/cores/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in nostalgist npm:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
