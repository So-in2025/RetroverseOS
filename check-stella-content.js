async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@1.0.1/cores/stella_libretro.js';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('First 200 chars:', text.substring(0, 200));
  } catch (e) {
    console.error(e);
  }
}
test();
