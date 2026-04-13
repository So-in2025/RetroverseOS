async function test() {
  const url = 'https://api.github.com/repos/monteslu/retroemu/contents/cores';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Cores:', data.map(f => f.name));
  } catch (e) {
    console.error(e);
  }
}
test();
