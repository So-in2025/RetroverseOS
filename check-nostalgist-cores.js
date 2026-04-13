async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/@nostalgist/cores@latest/dist/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in @nostalgist/cores:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
