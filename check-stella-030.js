async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/dist/cores/stella_libretro.js';
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('First 200 chars:', text.substring(0, 200));
  } catch (e) {
    console.error(e);
  }
}
test();
