async function test() {
  const url = 'https://api.github.com/repos/retroemu/retroemu/contents/';
  try {
    const res = await fetch(url);
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (e) {
    console.error(e);
  }
}
test();
