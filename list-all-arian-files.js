async function test() {
  const url = 'https://api.github.com/repos/arianrhodsandlot/retroarch-emscripten-build/contents/retroarch?ref=v1.22.2';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const files = data.map(f => f.name);
    console.log('All Files:', files);
  } catch (e) {
    console.error(e);
  }
}
test();
