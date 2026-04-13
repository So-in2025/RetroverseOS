async function test() {
  const url = 'https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@v1.22.2/retroarch/';
  console.log('Fetching core list from', url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e);
  }
}
test();
