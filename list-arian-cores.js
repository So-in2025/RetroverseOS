async function check() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/';
  try {
    const res = await fetch(url);
    const text = await res.text();
    const matches = text.match(/[a-z0-9_]+_libretro\.zip/g);
    if (matches) {
      console.log('Available cores:', [...new Set(matches)].sort());
    } else {
      console.log('No cores found in listing');
    }
  } catch (e) {
    console.error(e);
  }
}
check();
