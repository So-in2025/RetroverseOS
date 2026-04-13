async function test() {
  const url = 'https://web.libretro.com/assets/cores/stella_libretro.js';
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Stella in web-libretro:', res.status);
  } catch (e) {
    console.error(e);
  }
}
test();
