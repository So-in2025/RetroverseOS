async function test() {
  const url = 'https://api.github.com/repos/arianrhodsandlot/retroarch-emscripten-build/contents/retroarch?ref=v1.22.2';
  try {
    const res = await fetch(url);
    const data = await res.json();
    const files = data.map(f => f.name);
    console.log('Files:', files.filter(f => f.includes('stella') || f.includes('prosystem') || f.includes('atari') || f.includes('2600') || f.includes('7800')));
  } catch (e) {
    console.error(e);
  }
}
test();
