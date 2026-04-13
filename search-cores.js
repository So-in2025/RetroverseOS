async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/';
  console.log('Searching for prosystem in', url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    const matches = text.match(/[a-z0-9_]+_libretro\.(js|wasm|zip)/g);
    if (matches) {
      const unique = [...new Set(matches)];
      console.log('Found cores:', unique.filter(c => c.includes('prosystem')));
      console.log('Total cores found:', unique.length);
    } else {
      console.log('No cores found in text.');
    }
  } catch (e) {
    console.error(e);
  }
}
test();
